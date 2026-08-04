import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdType, AdStatus, TransactionReason } from '@prisma/client';
const Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class AdsService {
  private razorpay: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    });
  }

  // ================= ADMIN FUNCTIONS =================

  async createAdPlan(name: string, type: AdType, durationDays: number, price: number) {
    return this.prisma.adPlan.create({
      data: { name, type, durationDays, price }
    });
  }

  async getAllAdsAdmin() {
    return this.prisma.advertisement.findMany({
      include: {
        shop: { select: { name: true } },
        plan: true
      },
      orderBy: { createdAt: 'desc' }
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
      `Your ${ad.plan.name} campaign is now live until ${endDate.toLocaleDateString()}`,
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
    await this.wallet.debit(userId, plan.price, TransactionReason.PURCHASE, `Purchased ${plan.name} Ad Campaign`);

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

  async createOnlinePurchase(userId: string, shopId: string, planId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop || shop.ownerId !== userId) throw new BadRequestException('Not authorized');

    const plan = await this.prisma.adPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Ad plan not available');

    const orderOptions = {
      amount: Math.round(plan.price * 100), // convert to paise
      currency: 'INR',
      receipt: `ad_rcpt_${Date.now()}`
    };

    const razorpayOrder = await this.razorpay.orders.create(orderOptions);

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: orderOptions.amount,
      plan
    };
  }

  async verifyOnlinePurchase(userId: string, shopId: string, planId: string, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string, data: any) {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid signature, payment failed');
    }

    const plan = await this.prisma.adPlan.findUnique({ where: { id: planId } });

    const ad = await this.prisma.advertisement.create({
      data: {
        shopId,
        planId,
        type: plan!.type,
        title: data.title,
        imageUrl: data.imageUrl,
        targetUrl: data.targetUrl,
        productId: data.productId,
        status: AdStatus.PENDING,
      }
    });

    return { message: 'Ad purchased successfully online', ad };
  }

  // ================= PUBLIC / CUSTOMER FUNCTIONS =================

  async getActiveAds(type: AdType, lat?: number, lng?: number) {
    const ads = await this.prisma.advertisement.findMany({
      where: {
        status: AdStatus.ACTIVE,
        type,
        endDate: { gt: new Date() } // Ensure it hasn't expired
      },
      include: { shop: { select: { id: true, name: true, logoUrl: true, latitude: true, longitude: true, deliveryRadius: true } } }
    });

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return ads.filter(ad => {
        if (!ad.shop || ad.shop.latitude == null || ad.shop.longitude == null) return false;
        const R = 6371; // Earth's radius in km
        const dLat = (ad.shop.latitude - lat) * (Math.PI / 180);
        const dLon = (ad.shop.longitude - lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * (Math.PI / 180)) * Math.cos(ad.shop.latitude * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        // Check if customer is within the shop's delivery radius (or default to 25km max)
        return distance <= Math.max(ad.shop.deliveryRadius || 5.0, 25.0);
      });
    }

    return ads;
  }

  async getShopAds(shopId: string) {
    return this.prisma.advertisement.findMany({
      where: { shopId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' }
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
