import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';
import { LoyaltyTransactionType, LoyaltyReason, TransactionReason } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  // Conversion rate: 50 points = 1 INR (500 points = ₹10)
  private readonly POINTS_TO_INR_RATIO = 50;
  // Reward for referring a friend
  private readonly REFERRAL_BONUS_POINTS = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly wallet: WalletService,
  ) {}

  async getLoyaltyAccount(userId: string) {
    let account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        }
      }
    });

    if (!account) {
      account = await this.prisma.loyaltyAccount.create({
        data: { userId },
        include: { transactions: true }
      });
    }

    // Fetch user referral code
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });

    return { ...account, referralCode: user?.referralCode };
  }

  async addPoints(userId: string, points: number, reason: LoyaltyReason, description?: string, referenceId?: string) {
    const account = await this.getLoyaltyAccount(userId);

    const transaction = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { increment: points } }
      });

      const tx = await prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: LoyaltyTransactionType.EARNED,
          points,
          reason,
          description,
          referenceId,
        }
      });

      return tx;
    });

    await this.notifications.sendInAppNotification(
      userId,
      'Points Earned! 🎉',
      `You just earned \${points} loyalty points!`,
      'SYSTEM'
    );

    return transaction;
  }

  async redeemPoints(userId: string, pointsToRedeem: number) {
    if (pointsToRedeem <= 0) throw new BadRequestException('Points must be positive');

    const account = await this.getLoyaltyAccount(userId);
    if (account.points < pointsToRedeem) {
      throw new BadRequestException('Insufficient loyalty points');
    }

    const conversionAmount = pointsToRedeem / this.POINTS_TO_INR_RATIO;

    await this.prisma.$transaction(async (prisma) => {
      // 1. Deduct points
      await prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { decrement: pointsToRedeem } }
      });

      await prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: LoyaltyTransactionType.REDEEMED,
          points: pointsToRedeem,
          reason: LoyaltyReason.PROMOTION,
          description: 'Converted to Wallet Cash',
        }
      });
    });

    // 2. Add cash to Wallet
    await this.wallet.credit(userId, conversionAmount, TransactionReason.CASHBACK, 'Loyalty Points Redemption');

    return { message: `Successfully converted \${pointsToRedeem} points to ₹\${conversionAmount}` };
  }

  async processReferral(newUserId: string, referralCode: string) {
    const referrer = await this.prisma.user.findUnique({ where: { referralCode } });
    if (!referrer) throw new NotFoundException('Invalid referral code');
    if (referrer.id === newUserId) throw new BadRequestException('Cannot refer yourself');

    // Check if already referred
    const existing = await this.prisma.referral.findUnique({ where: { referredId: newUserId } });
    if (existing) throw new BadRequestException('User already used a referral code');

    // Create referral link
    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: newUserId,
        isRewardClaimed: true, // Auto-claim for this implementation
      }
    });

    // Reward both users
    await this.addPoints(referrer.id, this.REFERRAL_BONUS_POINTS, LoyaltyReason.REFERRAL, 'Friend signed up');
    await this.addPoints(newUserId, this.REFERRAL_BONUS_POINTS, LoyaltyReason.REFERRAL, 'Sign up bonus');

    return { message: 'Referral applied successfully' };
  }
}
