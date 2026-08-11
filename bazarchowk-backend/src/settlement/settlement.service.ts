import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import {
  RecordCashCollectionDto,
  SubmitRiderDepositDto,
  VerifyDepositDto,
  CreateSettlementDto,
  MarkSettlementPaidDto,
} from './dto/settlement.dto';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  private async getAdminMarketId(user: any): Promise<string | undefined> {
    if (!user || user.role?.name === 'SUPER_ADMIN') return undefined;
    const adminUser = await this.prisma.user.findUnique({
      where: { id: user.id || user.userId },
      include: { managedMarket: true }
    });
    return adminUser?.managedMarket?.id;
  }

  // =============== RIDER: CASH COLLECTION ===============

  /**
   * Rider records cash collected for a COD order on delivery
   */
  async recordCashCollection(riderId: string, dto: RecordCashCollectionDto) {
    // Validate order exists and is COD + DELIVERED
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== 'COD') throw new BadRequestException('Order is not COD');
    if (order.status !== 'DELIVERED') throw new BadRequestException('Order must be DELIVERED before recording cash');
    if (order.riderId !== riderId) throw new BadRequestException('You are not the assigned rider for this order');

    // Prevent duplicate collection recording
    const existing = await this.prisma.cashCollection.findUnique({ where: { orderId: dto.orderId } });
    if (existing) throw new BadRequestException('Cash collection already recorded for this order');

    return this.prisma.cashCollection.create({
      data: {
        orderId: dto.orderId,
        riderId,
        amountCollected: dto.amountCollected,
        notes: dto.notes,
        status: 'COLLECTED',
      },
    });
  }

  /**
   * Rider views their uncollected cash and total outstanding
   */
  async getRiderCashSummary(riderId: string) {
    const [collected, submitted] = await Promise.all([
      this.prisma.cashCollection.findMany({
        where: { riderId, status: 'COLLECTED' },
        include: { order: { select: { orderNumber: true, totalAmount: true } } },
      }),
      this.prisma.cashCollection.aggregate({
        _sum: { amountCollected: true },
        where: { riderId, status: { in: ['COLLECTED'] } },
      }),
    ]);

    return {
      pendingCollections: collected,
      totalOutstanding: submitted._sum.amountCollected || 0,
    };
  }

  /**
   * Rider submits a batch of collected cash to the market admin
   */
  async submitRiderDeposit(riderId: string, dto: SubmitRiderDepositDto) {
    // Validate all collections belong to this rider and are in COLLECTED state
    const collections = await this.prisma.cashCollection.findMany({
      where: { id: { in: dto.collectionIds }, riderId, status: 'COLLECTED' },
    });

    if (collections.length !== dto.collectionIds.length) {
      throw new BadRequestException('Some collections are invalid or already submitted');
    }

    const calculatedTotal = collections.reduce((sum, c) => sum + c.amountCollected, 0);
    if (Math.abs(calculatedTotal - dto.totalAmount) > 0.01) {
      throw new BadRequestException(`Amount mismatch: Expected ₹${calculatedTotal.toFixed(2)}, got ₹${dto.totalAmount}`);
    }

    // Create deposit and link collections
    const deposit = await this.prisma.riderDeposit.create({
      data: {
        riderId,
        totalAmount: dto.totalAmount,
        receiptImageUrl: dto.receiptImageUrl,
        status: 'PENDING',
      },
    });

    // Update all collections to SUBMITTED state and link to deposit
    await this.prisma.cashCollection.updateMany({
      where: { id: { in: dto.collectionIds } },
      data: { status: 'SUBMITTED', riderDepositId: deposit.id },
    });

    this.logger.log(`Rider ${riderId} submitted deposit of ₹${dto.totalAmount} (ID: ${deposit.id})`);
    return deposit;
  }

  // =============== MARKET ADMIN: DEPOSIT VERIFICATION ===============

  async getPendingDeposits(user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const where: any = { status: 'PENDING' };
    if (marketId) {
      where.rider = { deliveryPartner: { marketId } };
    }
    
    return this.prisma.riderDeposit.findMany({
      where,
      include: {
        rider: { select: { firstName: true, lastName: true, phone: true } },
        collections: { include: { order: { select: { orderNumber: true, totalAmount: true } } } },
      },
      orderBy: { depositDate: 'asc' },
    });
  }

  async verifyDeposit(depositId: string, adminId: string, dto: VerifyDepositDto) {
    const deposit = await this.prisma.riderDeposit.findUnique({ where: { id: depositId } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING') throw new BadRequestException('Deposit is not in PENDING status');

    if (dto.status === 'REJECTED' && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a deposit');
    }

    const newCollectionStatus = dto.status === 'VERIFIED' ? 'VERIFIED' : 'COLLECTED';

    await this.prisma.cashCollection.updateMany({
      where: { riderDepositId: depositId },
      data: {
        status: dto.status === 'VERIFIED' ? 'VERIFIED' : 'COLLECTED',
        riderDepositId: dto.status === 'REJECTED' ? null : undefined,
      },
    });

    const updatedDeposit = await this.prisma.riderDeposit.update({
      where: { id: depositId },
      data: {
        status: dto.status,
        verifiedById: adminId,
        verifiedAt: dto.status === 'VERIFIED' ? new Date() : null,
        rejectionReason: dto.rejectionReason,
      },
    });

    // Notify Rider
    const message = dto.status === 'VERIFIED' 
      ? `Your cash deposit of ₹${deposit.totalAmount} has been verified.`
      : `Your cash deposit was rejected. Reason: ${dto.rejectionReason}`;
      
    await this.notificationsService.sendInAppNotification(
      deposit.riderId,
      `Deposit ${dto.status}`,
      message,
      'SYSTEM'
    );

    return updatedDeposit;
  }

  // =============== ADMIN: SHOP SETTLEMENT ===============

  /**
   * Generate a settlement for a shop for a given date range
   */
  async createShopSettlement(adminId: string, dto: CreateSettlementDto) {
    // SECURITY PATCH: Verify Admin Role to prevent Commission Tampering
    const adminUser = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true }
    });

    let commissionPct = 5; // Absolute baseline fallback
    if (adminUser?.role?.name === 'SUPER_ADMIN' && dto.commissionPercent !== undefined) {
      commissionPct = dto.commissionPercent; // Only SuperAdmin can negotiate/change commission
    } else if (dto.commissionPercent !== undefined && dto.commissionPercent !== 5) {
      this.logger.warn(`SECURITY ALERT: User ${adminId} (${adminUser?.role?.name}) attempted to alter commission to ${dto.commissionPercent}%. Blocked.`);
      // Enforce 5% for all standard Market/District Admins regardless of DTO injection
      commissionPct = 5;
    }
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Wrap the entire settlement generation in an interactive transaction to prevent race conditions
    const settlement = await this.prisma.$transaction(async (tx) => {
      // Fetch all delivered orders for this shop in the period (not yet settled)
      const orders = await tx.order.findMany({
        where: {
          shopId: dto.shopId,
          status: 'DELIVERED',
          createdAt: { gte: periodStart, lte: periodEnd },
          settlementItem: null, // not yet in any settlement
        },
      });

      if (orders.length === 0) {
        throw new BadRequestException('No unsettled delivered orders found for this period');
      }

      const totalOrderAmount = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalDeliveryFees = orders.reduce((sum, o) => sum + o.deliveryFee, 0);
      const platformCommission = (totalOrderAmount * commissionPct) / 100;
      const netSettlementAmt = totalOrderAmount - platformCommission - totalDeliveryFees;

      // Create settlement with all line items atomically
      const newSettlement = await tx.shopSettlement.create({
        data: {
          shopId: dto.shopId,
          settledById: adminId,
          totalOrderAmount,
          platformCommission,
          deliveryFeeTotal: totalDeliveryFees,
          netSettlementAmt,
          periodStart,
          periodEnd,
          status: 'PENDING',
          items: {
            create: orders.map(order => ({
              orderId: order.id,
              orderAmount: order.totalAmount,
              commission: (order.totalAmount * commissionPct) / 100,
              deliveryFee: order.deliveryFee,
              netAmount: order.totalAmount - (order.totalAmount * commissionPct) / 100 - order.deliveryFee,
            })),
          },
        },
        include: { items: true, shop: { select: { ownerId: true, name: true } } },
      });

      return newSettlement;
    }, {
      isolationLevel: 'Serializable', // Ensures absolute consistency for financial records
    });

    this.logger.log(`Settlement created for Shop ${dto.shopId}: ₹${settlement.netSettlementAmt.toFixed(2)} net (ID: ${settlement.id})`);
    
    // Notify Shop Owner
    await this.notificationsService.sendInAppNotification(
      settlement.shop.ownerId,
      'New Settlement Generated',
      `A settlement of ₹${settlement.netSettlementAmt.toFixed(2)} has been generated for ${settlement.shop.name}.`,
      'SYSTEM'
    );

    return settlement;
  }

  async markSettlementPaid(settlementId: string, dto: MarkSettlementPaidDto) {
    const settlement = await this.prisma.shopSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status === 'COMPLETED') throw new BadRequestException('Settlement already paid');

    const updatedSettlement = await this.prisma.shopSettlement.update({
      where: { id: settlementId },
      data: { status: 'COMPLETED', paymentReference: dto.paymentReference, settledAt: new Date() },
      include: { shop: { select: { ownerId: true, name: true, upiId: true, bankAccountNumber: true } } },
    });

    // Notify Shop Owner via In-App Notification
    await this.notificationsService.sendInAppNotification(
      updatedSettlement.shop.ownerId,
      'Settlement Paid',
      `Your settlement of ₹${updatedSettlement.netSettlementAmt.toFixed(2)} has been paid via ${updatedSettlement.shop.upiId || 'Bank Transfer'}. Ref: ${dto.paymentReference}`,
      'SYSTEM'
    );

    // Automate Email Confirmation with PDF Attachment
    const owner = await this.prisma.user.findUnique({ where: { id: updatedSettlement.shop.ownerId } });
    if (owner && owner.email) {
      const totalOrders = await this.prisma.order.count({
        where: { shopId: updatedSettlement.shopId, status: 'DELIVERED', createdAt: { gte: updatedSettlement.periodStart, lte: updatedSettlement.periodEnd } }
      });

      await this.emailService.sendSettlementEmail(owner.email, {
        shopName: updatedSettlement.shop.name,
        periodStart: updatedSettlement.periodStart,
        periodEnd: updatedSettlement.periodEnd,
        settlementId: updatedSettlement.id,
        paymentRef: dto.paymentReference || 'N/A',
        paymentMode: updatedSettlement.shop.upiId ? `UPI (${updatedSettlement.shop.upiId})` : 'Bank Transfer',
        totalOrders: totalOrders,
        grossSales: updatedSettlement.totalOrderAmount,
        commission: updatedSettlement.platformCommission,
        netPayout: updatedSettlement.netSettlementAmt
      });
      
      this.logger.log(`Live Settlement PDF Email sent to ${owner.email} for Shop ${updatedSettlement.shop.name}`);
    }

    return updatedSettlement;
  }

  async getSettlements(shopId?: string, status?: string, page = 1, limit = 20, user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;
    if (marketId) where.shop = { marketId };

    const [data, total] = await Promise.all([
      this.prisma.shopSettlement.findMany({
        where, skip, take: limit,
        include: {
          shop: { select: { id: true, name: true, city: true } },
          settledBy: { select: { firstName: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shopSettlement.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // =============== REPORTS ===============

  async getSettlementReport(startDate: Date, endDate: Date) {
    const [totalSettled, pendingSettlements, totalCommissionEarned] = await Promise.all([
      this.prisma.shopSettlement.aggregate({
        _sum: { netSettlementAmt: true, platformCommission: true },
        where: { status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.shopSettlement.count({ where: { status: 'PENDING' } }),
      this.prisma.shopSettlement.aggregate({
        _sum: { platformCommission: true },
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    return {
      totalSettledToShops: totalSettled._sum.netSettlementAmt || 0,
      totalCommissionEarned: totalCommissionEarned._sum.platformCommission || 0,
      pendingSettlements,
    };
  }

  // =============== PARTNER FINANCIAL DASHBOARD ===============

  async getShopFinancialDashboard(userId: string) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerId: userId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      orders7Days,
      orders7DaysCOD,
      orders7DaysOnline,
      ordersThisMonth,
      ordersThisMonthCOD,
      ordersThisMonthOnline,
      ordersToday,
      ordersTodayCOD,
      ordersTodayOnline,
      settlements7Days,
      settlementsThisMonth,
      settlementsToday,
      pendingSettlementAmt
    ] = await Promise.all([
      // Gross sales last 7 days (Delivered)
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: sevenDaysAgo } }
      }),
      // Gross sales last 7 days COD
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: sevenDaysAgo }, paymentMethod: 'COD' }
      }),
      // Gross sales last 7 days Online
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: sevenDaysAgo }, paymentMethod: { not: 'COD' } }
      }),
      // Gross sales this month
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: firstDayOfMonth } }
      }),
      // Gross sales this month COD
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: firstDayOfMonth }, paymentMethod: 'COD' }
      }),
      // Gross sales this month Online
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: firstDayOfMonth }, paymentMethod: { not: 'COD' } }
      }),
      // Gross sales today
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: today } }
      }),
      // Gross sales today COD
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: today }, paymentMethod: 'COD' }
      }),
      // Gross sales today Online
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { shopId: shop.id, status: 'DELIVERED', createdAt: { gte: today }, paymentMethod: { not: 'COD' } }
      }),
      // Net settlements received last 7 days (Completed)
      this.prisma.shopSettlement.aggregate({
        _sum: { netSettlementAmt: true },
        where: { shopId: shop.id, status: 'COMPLETED', settledAt: { gte: sevenDaysAgo } }
      }),
      // Net settlements received this month
      this.prisma.shopSettlement.aggregate({
        _sum: { netSettlementAmt: true },
        where: { shopId: shop.id, status: 'COMPLETED', settledAt: { gte: firstDayOfMonth } }
      }),
      // Net settlements received today
      this.prisma.shopSettlement.aggregate({
        _sum: { netSettlementAmt: true },
        where: { shopId: shop.id, status: 'COMPLETED', settledAt: { gte: today } }
      }),
      // Unsettled amount currently pending
      this.prisma.shopSettlement.aggregate({
        _sum: { netSettlementAmt: true },
        where: { shopId: shop.id, status: 'PENDING' }
      })
    ]);

    return {
      last7Days: {
        grossSales: orders7Days._sum.totalAmount || 0,
        codCollected: orders7DaysCOD._sum.totalAmount || 0,
        onlinePaid: orders7DaysOnline._sum.totalAmount || 0,
        totalDeliveries: orders7Days._count.id || 0,
        netSettled: settlements7Days._sum.netSettlementAmt || 0,
      },
      thisMonth: {
        grossSales: ordersThisMonth._sum.totalAmount || 0,
        codCollected: ordersThisMonthCOD._sum.totalAmount || 0,
        onlinePaid: ordersThisMonthOnline._sum.totalAmount || 0,
        totalDeliveries: ordersThisMonth._count.id || 0,
        netSettled: settlementsThisMonth._sum.netSettlementAmt || 0,
      },
      today: {
        grossSales: ordersToday._sum.totalAmount || 0,
        codCollected: ordersTodayCOD._sum.totalAmount || 0,
        onlinePaid: ordersTodayOnline._sum.totalAmount || 0,
        totalDeliveries: ordersToday._count.id || 0,
        netSettled: settlementsToday._sum.netSettlementAmt || 0,
      },
      pendingSettlement: pendingSettlementAmt._sum.netSettlementAmt || 0
    };
  }
}
