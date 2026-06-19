import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommissionRuleDto, CalculateCommissionDto } from './dto/commission.dto';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // =============== COMMISSION RULE MANAGEMENT ===============

  async createRule(dto: CreateCommissionRuleDto) {
    const rule = await this.prisma.commissionRule.create({ data: dto });
    
    // Notify super admins that a new financial rule is active
    if (dto.scope === 'GLOBAL') {
      // In production, we'd fetch SUPER_ADMIN ids. For now, log.
      this.logger.log(`A new GLOBAL commission rule was created: ${dto.name}`);
    } else if (dto.scope === 'SHOP' && dto.shopId) {
      const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId }, select: { ownerId: true } });
      if (shop) {
        await this.notificationsService.sendInAppNotification(
          shop.ownerId,
          'Custom Commission Rule Applied',
          `A new custom commission rule (${dto.commissionPercent}%) has been applied to your shop.`,
          'SYSTEM'
        );
      }
    }
    return rule;
  }

  async getAllRules() {
    return this.prisma.commissionRule.findMany({
      where: { isActive: true },
      orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateRule(id: string, data: Partial<CreateCommissionRuleDto>) {
    const rule = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Commission rule not found');
    return this.prisma.commissionRule.update({ where: { id }, data });
  }

  async toggleRule(id: string, isActive: boolean) {
    return this.prisma.commissionRule.update({ where: { id }, data: { isActive } });
  }

  // =============== COMMISSION CALCULATION ===============

  /**
   * Rule priority: SHOP > CITY > CATEGORY > GLOBAL
   * Finds the most specific applicable rule for an order
   */
  async resolveRule(shopId: string, citySlug?: string, categoryId?: string): Promise<any> {
    // 1. Shop-specific override (highest priority)
    let rule = await this.prisma.commissionRule.findFirst({
      where: { scope: 'SHOP', shopId, isActive: true },
    });
    if (rule) return rule;

    // 2. City-specific rule
    if (citySlug) {
      rule = await this.prisma.commissionRule.findFirst({
        where: { scope: 'CITY', citySlug, isActive: true },
      });
      if (rule) return rule;
    }

    // 3. Category-specific rule
    if (categoryId) {
      rule = await this.prisma.commissionRule.findFirst({
        where: { scope: 'CATEGORY', categoryId, isActive: true },
      });
      if (rule) return rule;
    }

    // 4. Global fallback
    rule = await this.prisma.commissionRule.findFirst({
      where: { scope: 'GLOBAL', isActive: true },
      orderBy: { createdAt: 'asc' }, // Oldest global rule = most stable
    });

    if (!rule) throw new BadRequestException('No active commission rule found. Please configure a GLOBAL rule first.');
    return rule;
  }

  /**
   * Calculate and persist a commission record for a delivered order
   * Called automatically when order status → DELIVERED
   */
  async calculateAndRecord(dto: CalculateCommissionDto) {
    const existing = await this.prisma.commission.findUnique({ where: { orderId: dto.orderId } });
    if (existing) return existing; // Idempotent — don't double-charge

    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const rule = dto.ruleId
      ? await this.prisma.commissionRule.findUnique({ where: { id: dto.ruleId } })
      : await this.resolveRule(dto.shopId, shop.city);

    if (!rule) throw new NotFoundException('Commission rule not found');

    const commissionAmt = (dto.orderAmount * rule.commissionPercent) / 100;
    const platformFee = (dto.orderAmount * rule.platformFeePercent) / 100;
    const deliveryFee = rule.deliveryFeeFixed;
    const netShopPayable = dto.orderAmount - commissionAmt - deliveryFee;

    // Use an interactive transaction to ensure Commission and Ledger entries are atomically saved
    const result = await this.prisma.$transaction(async (tx) => {
      const commission = await tx.commission.create({
        data: {
          orderId: dto.orderId,
          shopId: dto.shopId,
          ruleId: rule.id,
          orderAmount: dto.orderAmount,
          commissionAmt,
          deliveryFee,
          platformFee,
          netShopPayable,
        },
      });

      // Post entries to RevenueLedger atomically
      await tx.revenueLedger.createMany({
        data: [
          {
            entryType: 'ORDER_COMMISSION',
            referenceId: dto.orderId,
            referenceType: 'ORDER',
            amount: commissionAmt,
            description: `${rule.commissionPercent}% commission on order ${dto.orderId}`,
            shopId: dto.shopId,
            citySlug: shop.city,
          },
          {
            entryType: 'DELIVERY_FEE',
            referenceId: dto.orderId,
            referenceType: 'ORDER',
            amount: deliveryFee,
            description: `Delivery fee for order ${dto.orderId}`,
            shopId: dto.shopId,
            citySlug: shop.city,
          },
          {
            entryType: 'PLATFORM_FEE',
            referenceId: dto.orderId,
            referenceType: 'ORDER',
            amount: platformFee,
            description: `Platform fee (${rule.platformFeePercent}%) for order ${dto.orderId}`,
            shopId: dto.shopId,
            citySlug: shop.city,
          },
        ],
      });

      return commission;
    }, {
      isolationLevel: 'Serializable', // Prevent race conditions during financial calculation
    });

    this.logger.log(`Commission recorded: Order ${dto.orderId} → Commission ₹${commissionAmt.toFixed(2)}, Net to Shop ₹${netShopPayable.toFixed(2)}`);
    return result;
  }

  // =============== ADVERTISEMENT REVENUE ===============

  async recordAdRevenue(adId: string, shopId: string, days: number, type: 'SHOP' | 'PRODUCT', citySlug?: string) {
    const rule = await this.resolveRule(shopId, citySlug);
    const rate = type === 'SHOP' ? rule.featuredShopDailyRate : rule.featuredProductDailyRate;
    const amount = rate * days;

    await this.prisma.revenueLedger.create({
      data: {
        entryType: 'AD_REVENUE',
        referenceId: adId,
        referenceType: 'ADVERTISEMENT',
        amount,
        description: `Featured ${type} ad revenue — ${days} days @ ₹${rate}/day`,
        shopId,
        citySlug,
      },
    });

    return { adId, amount, days, ratePerDay: rate };
  }

  // =============== REVENUE REPORTS ===============

  async getRevenueSummary(startDate: Date, endDate: Date, citySlug?: string) {
    const where: any = { createdAt: { gte: startDate, lte: endDate } };
    if (citySlug) where.citySlug = citySlug;

    const [byType, totalPlatformRevenue, unsettledCommissions] = await Promise.all([
      this.prisma.revenueLedger.groupBy({
        by: ['entryType'],
        _sum: { amount: true },
        _count: { id: true },
        where,
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.revenueLedger.aggregate({
        _sum: { amount: true },
        where,
      }),
      this.prisma.commission.aggregate({
        _sum: { commissionAmt: true, deliveryFee: true, platformFee: true },
        _count: { id: true },
        where: { isSettled: false, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    return {
      totalPlatformRevenue: totalPlatformRevenue._sum.amount || 0,
      revenueByType: byType,
      unsettled: {
        count: unsettledCommissions._count.id,
        commissionPending: unsettledCommissions._sum.commissionAmt || 0,
        deliveryFeePending: unsettledCommissions._sum.deliveryFee || 0,
        platformFeePending: unsettledCommissions._sum.platformFee || 0,
      },
    };
  }

  async getCityRevenueBreakdown(startDate: Date, endDate: Date) {
    return this.prisma.revenueLedger.groupBy({
      by: ['citySlug', 'entryType'],
      _sum: { amount: true },
      where: { createdAt: { gte: startDate, lte: endDate } },
      orderBy: { citySlug: 'asc' },
    });
  }

  async getShopCommissionHistory(shopId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.commission.findMany({
        where: { shopId },
        skip, take: limit,
        include: { rule: { select: { name: true, commissionPercent: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commission.count({ where: { shopId } }),
    ]);
    return { data, total, page, limit };
  }

  async getLedger(page = 1, limit = 50, entryType?: string, citySlug?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (entryType) where.entryType = entryType;
    if (citySlug) where.citySlug = citySlug;

    const [data, total] = await Promise.all([
      this.prisma.revenueLedger.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.revenueLedger.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
