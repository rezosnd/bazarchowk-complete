import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { PaymentMethod } from '@prisma/client';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class VoiceOrderingService {
  private readonly logger = new Logger(VoiceOrderingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly appointmentsService: AppointmentsService,
    private readonly geminiService: GeminiService
  ) {}

  async processConversationalVoiceOrder(userId: string, transcript: string | undefined, sessionId: string, language: string = 'hi-IN', audioUrl?: string, audioBase64?: string) {
    if (!transcript?.trim() && !audioBase64) {
      throw new BadRequestException('Voice transcript or audio must be provided');
    }

    const historyLogs = await this.prisma.voiceOrderLog.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: 'asc' }
    });

    const messages = [
      {
        role: "system",
        content: `You are the BazarChowk Voice AI. 
        Flows:
        GROCERY: 
          1. User: "2 kg aaloo" -> Ask for shop -> action: "ASK_SHOP"
          2. User: "xyz shop" -> action: "ADD_TO_CART", items: [...]
          3. User: "Nahi dudh nikal do" -> action: "REMOVE_FROM_CART", items: [...]
          4. User: "Haan order kardo" -> action: "CONFIRM_ORDER"
        APPOINTMENT (Salon/Doctor/Plumber): 
          1. User: "Mujhe salon book karna hai" -> action: "ASK_SHOP", aiVoiceReply: "Aap kis dukan se book karna chahenge?"
          2. User: "xyz shop" -> action: "ASK_TIME", aiVoiceReply: "Kitne baje?"
          3. User: "2 baje" -> action: "CHECK_APPOINTMENT", shopName: "xyz", appointmentTime: "14:00"

        OUTPUT FORMAT MUST BE STRICT JSON:
        {
          "aiVoiceReply": "Text to speak back to the user in their regional language",
          "intent": "GROCERY" | "APPOINTMENT",
          "action": "ASK_SHOP" | "ASK_TIME" | "CHECK_APPOINTMENT" | "ADD_TO_CART" | "REMOVE_FROM_CART" | "CONFIRM_ORDER",
          "shopName": "Extracted shop name if they provided one",
          "appointmentTime": "Time in HH:mm format if provided",
          "items": [ { "searchTerm": "Aloo translated to English", "quantity": 1, "unit": "kg" } ]
        }
        IMPORTANT: If the user provided audio (and no transcript), you must accurately transcribe their speech and include it in the JSON as the "transcript" field.`
      }
    ];

    for (const log of historyLogs) {
      messages.push({ role: "user", content: log.transcript });
      if (log.aiReply) {
        messages.push({ role: "assistant", content: log.aiReply });
      }
    }

    if (transcript?.trim()) {
      messages.push({ role: "user", content: transcript });
    }

    let aiOutput: any = {};
    try {
      const systemPromptMsg = messages.find(m => m.role === 'system');
      const systemPrompt = systemPromptMsg ? systemPromptMsg.content : '';
      const rawContent = await this.geminiService.processVoiceAssistant(messages, systemPrompt, audioBase64);
      
      // Attempt to clean markdown JSON formatting if present
      const cleanedContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      aiOutput = JSON.parse(cleanedContent);
    } catch (error) {
      this.logger.error('AI Conversational Error:', error);
      throw new BadRequestException('Failed to process voice AI intent. Please try again.');
    }

    const log = await this.prisma.voiceOrderLog.create({
      data: {
        userId,
        sessionId,
        transcript: transcript || aiOutput.transcript || "Audio input",
        language,
        audioUrl,
        aiReply: aiOutput.aiVoiceReply,
        parsedItems: aiOutput.items ? aiOutput.items : undefined,
        isSuccessful: true
      }
    });

    // --------------------------------------------------------
    // APPOINTMENT BOOKING EXECUTION
    // --------------------------------------------------------
    if (aiOutput.action === 'CHECK_APPOINTMENT' && aiOutput.intent === 'APPOINTMENT') {
        const shop = await this.prisma.shop.findFirst({
            where: { name: { contains: aiOutput.shopName || '', mode: 'insensitive' } }
        });

        if (!shop) {
             return { message: 'Shop not found', aiVoiceReply: 'Mujhe woh dukan nahi mili.', action: 'ASK_SHOP', logId: log.id };
        }

        const provider = await this.prisma.provider.findFirst({ where: { shopId: shop.id } });
        const service = await this.prisma.serviceOffering.findFirst({ where: { shopId: shop.id } });
        
        if (!provider || !service) {
             return { message: 'No service available', aiVoiceReply: 'Is dukan me koi service available nahi hai.', action: 'FAIL', logId: log.id };
        }
        
        const requestedHour = parseInt(aiOutput.appointmentTime?.split(':')[0] || '14');
        
        // Exact logic requested: 2 PM (14:00) is mathematically simulated as FULL to show the fallback capability.
        if (requestedHour === 14) { 
             return {
                 message: 'Slot full',
                 aiVoiceReply: `Maaf karein, 2 baje ka slot full hai. Available times ye hain: 3 baje aur 4 baje. Aap kaun sa book karna chahenge?`,
                 action: 'ASK_TIME',
                 shopSelected: shop.name,
                 logId: log.id
             };
        } else {
             // Any other time (e.g. 3 PM) triggers the Auto-Booking
             const freeTimeSlot = await this.prisma.timeSlot.findFirst({ 
                 where: { providerId: provider.id, isBooked: false } 
             });
             
             let appointmentDetails = null;
             if (freeTimeSlot) {
                 appointmentDetails = await this.appointmentsService.bookAppointment(userId, {
                    serviceOfferingId: service.id,
                    providerId: provider.id,
                    timeSlotId: freeTimeSlot.id,
                    notes: 'Voice AI Auto-Booked'
                 });
             }
             return {
                 message: 'Appointment Auto-Booked',
                 aiVoiceReply: `Thik hai, aapka ${requestedHour} baje ka appointment ${shop.businessName} me book ho gaya hai. Mujhe bataiye agar kuch aur chahiye.`,
                 action: 'BOOKED',
                 shopSelected: shop.name,
                 orderDetails: appointmentDetails,
                 logId: log.id
             };
        }
    }

    // --------------------------------------------------------
    // GROCERY AUTO-CHECKOUT EXECUTION
    // --------------------------------------------------------
    const addedToCart = [];
    let orderPlaced = false;
    let orderDetails = null;

    if (aiOutput.action === 'ADD_TO_CART' && aiOutput.items?.length > 0) {
      const shop = await this.prisma.shop.findFirst({
        where: { name: { contains: aiOutput.shopName || '', mode: 'insensitive' } }
      });

      if (!shop) {
        return {
          message: 'Shop not found',
          aiVoiceReply: 'Mujhe woh dukan nahi mili. Kripya dukan ka naam phir se bataye.',
          action: 'ASK_SHOP',
          logId: log.id
        };
      }

      let grandTotal = 0;
      let orderDetailsText = "";

      for (const item of aiOutput.items) {
        const product = await this.prisma.product.findFirst({
          where: { 
            name: { contains: item.searchTerm, mode: 'insensitive' },
            shopId: shop.id
          },
          include: { variants: true }
        });

        if (product && product.variants.length > 0) {
          const variant = product.variants[0];
          await this.cartService.addToCart(userId, {
            productVariantId: variant.id,
            quantity: item.quantity
          });
          
          const itemTotal = Number(variant.price) * item.quantity;
          grandTotal += itemTotal;
          orderDetailsText += `${item.quantity} ${product.name}, `;
          
          addedToCart.push({ productName: product.name, added: true, price: itemTotal });
        }
      }

      if (addedToCart.length > 0) {
        aiOutput.aiVoiceReply = `Aapke cart me ${orderDetailsText} add ho gaya hai. Total bill ${grandTotal} rupaiye hai. Kya aap order confirm karna chahte hain?`;
      } else {
        aiOutput.aiVoiceReply = 'Maaf karein, mujhe us dukan mein wo items nahi mile.';
      }
    } else if (aiOutput.action === 'REMOVE_FROM_CART' && aiOutput.items?.length > 0) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: { productVariant: { include: { product: true } } } } }
      });
      
      if (cart && cart.items.length > 0) {
        let removedItemsText = "";
        for (const item of aiOutput.items) {
           const cartItem = cart.items.find(ci => ci.productVariant.product.name.toLowerCase().includes(item.searchTerm.toLowerCase()));
           if (cartItem) {
             await this.cartService.removeItem(userId, cartItem.id);
             removedItemsText += `${cartItem.productVariant.product.name}, `;
           }
        }
        if (removedItemsText) {
          aiOutput.aiVoiceReply = `Thik hai, maine ${removedItemsText} cart se nikal diya hai. Baki items order karne ke liye haan bolein.`;
        } else {
          aiOutput.aiVoiceReply = `Mujhe cart me wo item nahi mila.`;
        }
      } else {
        aiOutput.aiVoiceReply = `Aapka cart pehle se hi khali hai.`;
      }
    } else if (aiOutput.action === 'CONFIRM_ORDER') {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true }
      });

      if (!cart || cart.items.length === 0) {
        aiOutput.aiVoiceReply = 'Aapka cart khali hai. Pehle kuch items add karein.';
      } else {
        const userAddress = await this.prisma.address.findFirst({ where: { userId } });
        if (!userAddress) throw new BadRequestException('Delivery address missing.');

        const firstItem = await this.prisma.productVariant.findUnique({
          where: { id: cart.items[0].productVariantId },
          include: { product: true }
        });

        if (firstItem) {
          const order = await this.ordersService.createOrder(userId, {
            shopId: firstItem.product.shopId,
            paymentMethod: PaymentMethod.COD,
            deliveryAddressId: userAddress.id
          });
          
          orderPlaced = true;
          orderDetails = order;
          aiOutput.aiVoiceReply = `Aapka order successfully place ho gaya hai! Delivery jaldi pahuchegi.`;
        }
      }
    }

    return {
      message: 'Conversational voice step processed',
      aiVoiceReply: aiOutput.aiVoiceReply,
      action: aiOutput.action,
      shopSelected: aiOutput.shopName,
      cartResults: addedToCart,
      orderPlaced,
      orderDetails,
      logId: log.id
    };
  }
}
