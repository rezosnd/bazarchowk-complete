import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdType, AdStatus, TransactionReason } from '@prisma/client';

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService
  ) {}

  // ================= ADMIN FUNCTIONS =================

  async createAdPlan(name: string, type: AdType, durationDays: number, price: number) {
    return this.prisma.adPlan.create({
      data: { name, type, durationDays, price }
    });
  }

  async approveAd(adId: string) {
    const ad = await this.prisma.advertisement.findUnique({ where: { id: adId }, include: { plan: true, shop: true } });
    if (!ad) throw new NotFoundException('Ad not found');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + ad.plan.durationDays);

    const updated = await this.prisma.advertisement.update({
      where: { id: adId },
      data: { status: AdStatus.ACTIVE, startDate, endDate }
    });

    await this.notifications.sendInAppNotification(
      ad.shop.ownerId,
      'Advertisement Approved!',
      `Your \${ad.plan.name} campaign is now live until \${endDate.toLocaleDateString()}`,
      'SYSTEM'
    );

    return updated;
  }

  // ================= SHOP OWNER FUNCTIONS =================

  async getAdPlans() {
    return this.prisma.adPlan.findMany({ where: { isActive: true } });
  }

  async purchaseAd(userId: string, shopId: string, planId: string, data: { title?: string; imageUrl?: string; targetUrl?: string; productId?: string }) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.ownerId !== userId) throw new BadRequestException('Not authorized for this shop');

    const plan = await this.prisma.adPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Ad plan not available');

    // Pay for the ad via Wallet!
    await this.wallet.debit(userId, plan.price, TransactionReason.PURCHASE, `Purchased \${plan.name} Ad Campaign`);

    const ad = await this.prisma.advertisement.create({
      data: {
        shopId,
        planId,
        type: plan.type,
        title: data.title,
        imageUrl: data.imageUrl,
        targetUrl: data.targetUrl,
        productId: data.productId,
        status: AdStatus.PENDING,
      }
    });

    return { message: 'Ad campaign purchased and is pending approval', ad };
  }

  // ================= PUBLIC / CUSTOMER FUNCTIONS =================

  async getActiveAds(type: AdType) {
    return this.prisma.advertisement.findMany({
      where: {
        status: AdStatus.ACTIVE,
        type,
        endDate: { gt: new Date() } // Ensure it hasn't expired
      },
      include: { shop: { select: { id: true, name: true, logoUrl: true } } }
    });
  }

  async recordImpression(adId: string) {
    await this.prisma.advertisement.update({
      where: { id: adId },
      data: { impressions: { increment: 1 } }
    });
  }

  async recordClick(adId: string) {
    await this.prisma.advertisement.update({
      where: { id: adId },
      data: { clicks: { increment: 1 } }
    });
  }
}
