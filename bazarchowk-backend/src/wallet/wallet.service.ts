import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionType, TransactionReason } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');

@Injectable()
export class WalletService {
  private razorpay: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditService: AuditService
  ) {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20, // Only fetch last 20 transactions for performance
        }
      }
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId },
        include: { transactions: true }
      });
    }

    return wallet;
  }

  async credit(userId: string, amount: number, reason: TransactionReason, description?: string, referenceId?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    // Make sure wallet exists
    await this.getWallet(userId);

    const transaction = await this.prisma.$transaction(async (prisma) => {
      const updatedWallet = await prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } }
      });

      const tx = await prisma.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          type: TransactionType.CREDIT,
          amount,
          reason,
          description,
          referenceId,
          balanceAfter: updatedWallet.balance,
        }
      });

      return tx;
    });

    await this.notifications.sendInAppNotification(
      userId,
      'Wallet Credited',
      `₹\${amount} has been added to your wallet.`,
      'WALLET'
    );

    await this.auditService.logAction({
      actorId: userId,
      action: 'WALLET_CREDIT',
      entity: 'WalletTransaction',
      entityId: transaction.id,
      newValue: JSON.stringify({ amount, reason, balanceAfter: transaction.balanceAfter }),
      ipAddress: 'System',
    });

    return transaction;
  }

  async debit(userId: string, amount: number, reason: TransactionReason, description?: string, referenceId?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const wallet = await this.getWallet(userId);
    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const transaction = await this.prisma.$transaction(async (prisma) => {
      const updatedWallet = await prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } }
      });

      const tx = await prisma.walletTransaction.create({
        data: {
          walletId: updatedWallet.id,
          type: TransactionType.DEBIT,
          amount,
          reason,
          description,
          referenceId,
          balanceAfter: updatedWallet.balance,
        }
      });

      return tx;
    });

    await this.notifications.sendInAppNotification(
      userId,
      'Wallet Debited',
      `₹\${amount} was deducted from your wallet.`,
      'WALLET'
    );

    await this.auditService.logAction({
      actorId: userId,
      action: 'WALLET_DEBIT',
      entity: 'WalletTransaction',
      entityId: transaction.id,
      newValue: JSON.stringify({ amount, reason, balanceAfter: transaction.balanceAfter }),
      ipAddress: 'System',
    });

    return transaction;
  }

  async createDepositLink(userId: string, amount: number, redirectUri: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!this.razorpay) throw new BadRequestException('Payment gateway not configured');

    const amountInPaise = Math.round(amount * 100);

    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const razorpayOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `wallet_${userId.substring(0, 10)}_${Date.now()}`,
      });

      return {
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to create payment link');
    }
  }

  async verifyDeposit(
    userId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
  ) {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Verify payment hasn't been processed
    const existingTx = await this.prisma.walletTransaction.findFirst({
      where: { referenceId: razorpayPaymentId }
    });

    if (existingTx) {
      return { success: true, message: 'Already processed' }; // Return success so frontend doesn't crash on retry
    }

    // Fetch the payment from Razorpay to get the actual amount paid
    let amount = 0;
    try {
      const payment = await this.razorpay.payments.fetch(razorpayPaymentId);
      amount = payment.amount / 100;
    } catch (e) {
      throw new BadRequestException('Failed to fetch payment details from Razorpay');
    }

    await this.credit(userId, amount, TransactionReason.DEPOSIT, 'Added money to wallet via Razorpay', razorpayPaymentId);
    return { success: true, message: 'Wallet credited successfully' };
  }
}
