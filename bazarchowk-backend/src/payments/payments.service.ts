import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
// Using commonjs require since razorpay has issues with esModuleInterop sometimes
const Razorpay = require('razorpay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
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

  async createRazorpayOrder(userId: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== userId) throw new BadRequestException('Not your order');
    if (order.paymentMethod !== PaymentMethod.RAZORPAY) {
      throw new BadRequestException('Order is not set to Razorpay payment method');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    if (!this.razorpay) {
      throw new BadRequestException('Razorpay is not configured');
    }

    try {
      // Amount is in smallest currency unit (paise)
      const amountInPaise = Math.round(order.totalAmount * 100);

      const razorpayOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_\${order.orderNumber}`,
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
        key: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: razorpayOrder.id,
        internalPaymentId: payment.id,
      };
    } catch (error) {
      this.logger.error('Failed to create Razorpay order', error);
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
      `Your payment for order \${payment.order.orderNumber} was successful.`,
      'PAYMENT'
    );
    
    // Notify Shop Owner
    await this.notifications.sendInAppNotification(
      payment.order.shop.ownerId,
      'Payment Received',
      `Online payment of ₹\${payment.amount} received for order \${payment.order.orderNumber}`,
      'PAYMENT'
    );

    return { success: true, message: 'Payment verified successfully' };
  }
}
