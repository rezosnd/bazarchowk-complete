import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionType, TransactionReason } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

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

    return transaction;
  }
}
