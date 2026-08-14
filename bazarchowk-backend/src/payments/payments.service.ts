import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
// Using commonjs require since razorpay has issues with esModuleInterop sometimes
const Razorpay = require('razorpay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    } else {
      this.logger.warn('Razorpay keys missing. Payments will fail in production.');
    }
  }

  async createPaymentLink(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { customer: true }
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== userId) throw new BadRequestException('Not your order');
    if (order.paymentMethod !== PaymentMethod.RAZORPAY) {
      throw new BadRequestException('Order is not set to Razorpay');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    if (!this.razorpay) {
      throw new BadRequestException('Razorpay is not configured');
    }

    try {
      const amountInPaise = Math.round(order.totalAmount * 100);

      // Create Razorpay Order
      const razorpayOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `ref_${order.orderNumber}`,
        notes: {
          orderId: order.id,
          customerId: order.customerId
        }
      });

      // Upsert payment tracking record
      const payment = await this.prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          razorpayOrderId: razorpayOrder.id,
          amount: order.totalAmount,
        },
        create: {
          orderId: order.id,
          razorpayOrderId: razorpayOrder.id,
          amount: order.totalAmount,
        },
      });

      return {
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        orderId: order.id,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay Payment Link', error);
      throw new BadRequestException('Payment gateway error');
    }
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId: dto.razorpayOrderId },
      include: { order: { include: { shop: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(dto.razorpayOrderId + '|' + dto.razorpayPaymentId)
      .digest('hex');

    if (generatedSignature !== dto.razorpaySignature) {
      // Signature mismatch
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Invalid payment signature');
    }

    // Success
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: dto.razorpayPaymentId,
          razorpaySignature: dto.razorpaySignature,
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: PaymentStatus.PAID },
      }),
    ]);

    // Send notifications
    await this.notifications.sendInAppNotification(
      payment.order.customerId,
      'Payment Successful',
      `Your payment for order ${payment.order.orderNumber} was successful.`,
      'PAYMENT'
    );
    
    // Notify Shop Owner
    await this.notifications.sendInAppNotification(
      payment.order.shop.ownerId,
      'New Order Received',
      `You have a new order (${payment.order.orderNumber}) for ₹${payment.order.totalAmount} (Paid via Online)`,
      'ORDER'
    );

    this.realtime.sendToShop(payment.order.shopId, 'new_order', {
      orderId: payment.order.id,
      orderNumber: payment.order.orderNumber,
      totalAmount: payment.order.totalAmount
    });

    this.realtime.sendToAdmins('new_platform_order', {
      orderId: payment.order.id,
      shopId: payment.order.shopId,
      totalAmount: payment.order.totalAmount,
      timestamp: new Date()
    });

    return { success: true, message: 'Payment verified successfully' };
  }

  async handleWebhook(signature: string, payload: any) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    if (event === 'payment.captured') {
      const razorpayPaymentId = payload.payload.payment.entity.id;
      const razorpayOrderId = payload.payload.payment.entity.order_id;
      
      if (!razorpayOrderId) {
        // This was likely a wallet deposit (Payment Link without Order ID)
        return { received: true, note: 'Ignored non-order payment (likely wallet)' };
      }

      const payment = await this.prisma.payment.findUnique({
        where: { razorpayOrderId },
        include: { order: { include: { shop: true } } },
      });

      if (payment && payment.status !== PaymentStatus.PAID) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              razorpayPaymentId,
              status: PaymentStatus.PAID,
            },
          }),
          this.prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: PaymentStatus.PAID },
          }),
        ]);
        this.logger.log(`Payment captured via webhook for order ${payment.orderId}`);
        await this.notifications.sendInAppNotification(
          payment.order.shop.ownerId,
          'New Order Received',
          `You have a new order (${payment.order.orderNumber}) for ₹${payment.order.totalAmount} (Paid via Online)`,
          'ORDER'
        );
        this.realtime.sendToShop(payment.order.shopId, 'new_order', {
          orderId: payment.order.id,
          orderNumber: payment.order.orderNumber,
          totalAmount: payment.order.totalAmount
        });
        this.realtime.sendToAdmins('new_platform_order', {
          orderId: payment.order.id,
          shopId: payment.order.shopId,
          totalAmount: payment.order.totalAmount,
          timestamp: new Date()
        });
      }
    } else if (event === 'payment.failed') {
       const razorpayOrderId = payload.payload.payment.entity.order_id;
       if (!razorpayOrderId) {
         return { received: true, note: 'Ignored non-order payment failure' };
       }
       const payment = await this.prisma.payment.findUnique({
        where: { razorpayOrderId },
      });
      if (payment && payment.status !== PaymentStatus.FAILED) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.FAILED },
          }),
          this.prisma.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: PaymentStatus.FAILED },
          }),
        ]);
        this.logger.log(`Payment failed via webhook for order ${payment.orderId}`);
      }
    }
    return { received: true };
  }

  async refundPayment(orderId: string, adminId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Order is not paid, cannot refund');
    }

    if (order.paymentMethod === PaymentMethod.WALLET) {
      // Refund to wallet
      await this.prisma.$transaction(async (prisma) => {
        const wallet = await prisma.wallet.findUnique({ where: { userId: order.customerId } });
        if (!wallet) throw new NotFoundException('Wallet not found for customer');
        
        const updatedWallet = await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: order.totalAmount } }
        });
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: order.totalAmount,
            reason: 'REFUND',
            description: `Refund for order ${order.orderNumber}`,
            referenceId: order.id,
            balanceAfter: updatedWallet.balance,
          }
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: PaymentStatus.REFUNDED, status: 'CANCELLED' }
        });
      });
      return { success: true, method: 'WALLET' };
    } else if (order.paymentMethod === PaymentMethod.RAZORPAY) {
      if (!this.razorpay) throw new BadRequestException('Razorpay not configured');
      if (!order.payment || !order.payment.razorpayPaymentId) {
        throw new BadRequestException('No Razorpay payment captured for this order');
      }

      try {
        const refund = await this.razorpay.payments.refund(order.payment.razorpayPaymentId, {
          amount: Math.round(order.totalAmount * 100),
          notes: { reason }
        });

        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: order.payment.id },
            data: { status: PaymentStatus.REFUNDED }
          }),
          this.prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: PaymentStatus.REFUNDED, status: 'CANCELLED' }
          })
        ]);

        return { success: true, method: 'RAZORPAY', refundId: refund.id };
      } catch (err) {
        this.logger.error('Razorpay refund failed', err);
        throw new BadRequestException('Failed to process Razorpay refund');
      }
    } else {
      throw new BadRequestException('Cannot refund this payment method online');
    }
  }

  async getAllPayments(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take: limit,
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: { select: { firstName: true, lastName: true, phone: true } },
              shop: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.payment.count()
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
