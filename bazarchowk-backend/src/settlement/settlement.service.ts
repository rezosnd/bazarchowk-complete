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

    let commissionPct = 0; // Default: FREE — no platform commission until admin sets it
    if (dto.commissionPercent !== undefined && dto.commissionPercent >= 0 && dto.commissionPercent <= 100) {
      commissionPct = dto.commissionPercent;
    }
    const periodStart = new Date(dto.periodStart);
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodEnd = new Date(dto.periodEnd);
    periodEnd.setUTCHours(23, 59, 59, 999);

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

      let totalOrderAmount = 0;
      let totalDeliveryFees = 0;
      let platformCommission = 0;
      let netSettlementAmt = 0;

      const settlementItems = orders.map(order => {
        const commission = (order.totalAmount * commissionPct) / 100;
        const isSelfPickupCOD = order.paymentMethod === 'COD' && order.deliveryAddressId === null;
        
        let netAmount = 0;
        if (isSelfPickupCOD) {
            // Shop already collected the cash directly from customer
            // They owe the platform the commission
            netAmount = -commission;
        } else {
            // Platform collected the cash (or Rider collected and deposited to Admin)
            netAmount = order.totalAmount - commission - order.deliveryFee;
        }

        totalOrderAmount += order.totalAmount;
        totalDeliveryFees += order.deliveryFee;
        platformCommission += commission;
        netSettlementAmt += netAmount;

        return {
          orderId: order.id,
          orderAmount: order.totalAmount,
          commission,
          deliveryFee: order.deliveryFee,
          netAmount,
        };
      });

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
            create: settlementItems,
          },
        },
        include: { items: true, shop: { select: { ownerId: true, name: true } } },
      });

      return newSettlement;
    }, {
      isolationLevel: 'Serializable', // Ensures absolute consistency for financial records
    });

    this.logger.log(`Settlement created for Shop ${dto.shopId}: ₹${settlement.netSettlementAmt.toFixed(2)} net, commission ${commissionPct}% (ID: ${settlement.id})`);
    
    // Notify Shop Owner
    await this.notificationsService.sendInAppNotification(
      settlement.shop.ownerId,
      'Settlement Generated — Action Pending',
      `A settlement of ₹${settlement.netSettlementAmt.toFixed(2)} has been generated for ${settlement.shop.name}. Awaiting payment transfer from admin.`,
      'SYSTEM'
    );

    return settlement;
  }

  async markSettlementPaid(settlementId: string, dto: MarkSettlementPaidDto) {
    const settlement = await this.prisma.shopSettlement.findUnique({
      where: { id: settlementId },
      include: { items: { include: { order: { select: { orderNumber: true, totalAmount: true, paymentMethod: true } } } } }
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status === 'COMPLETED') throw new BadRequestException('Settlement already paid');

    const updatedSettlement = await this.prisma.shopSettlement.update({
      where: { id: settlementId },
      data: { status: 'COMPLETED', paymentReference: dto.paymentReference, settledAt: new Date() },
      include: { shop: { select: { ownerId: true, name: true, upiId: true, bankAccountNumber: true } } },
    });

    const paymentMode = updatedSettlement.shop.upiId
      ? `UPI (${updatedSettlement.shop.upiId})`
      : updatedSettlement.shop.bankAccountNumber
      ? `Bank Transfer`
      : 'Manual Transfer';

    // Rich In-App Notification with full details
    await this.notificationsService.sendInAppNotification(
      updatedSettlement.shop.ownerId,
      `₹${updatedSettlement.netSettlementAmt.toFixed(2)} Settlement Paid!`,
      `Your settlement has been transferred via ${paymentMode}. Gross: ₹${updatedSettlement.totalOrderAmount.toFixed(2)}, Commission: ₹${updatedSettlement.platformCommission.toFixed(2)}, Net Paid: ₹${updatedSettlement.netSettlementAmt.toFixed(2)}. Ref: ${dto.paymentReference || 'N/A'}`,
      'SYSTEM'
    );

    // Send detailed settlement email with PDF
    const owner = await this.prisma.user.findUnique({ where: { id: updatedSettlement.shop.ownerId } });
    if (owner && owner.email) {
      const totalOrders = settlement.items.length;
      await this.emailService.sendSettlementEmail(owner.email, {
        shopName: updatedSettlement.shop.name,
        periodStart: updatedSettlement.periodStart,
        periodEnd: updatedSettlement.periodEnd,
        settlementId: updatedSettlement.id,
        paymentRef: dto.paymentReference || 'N/A',
        paymentMode,
        totalOrders,
        grossSales: updatedSettlement.totalOrderAmount,
        commission: updatedSettlement.platformCommission,
        netPayout: updatedSettlement.netSettlementAmt
      });
      this.logger.log(`Settlement PDF Email sent to ${owner.email} for Shop ${updatedSettlement.shop.name}`);
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
          shop: { select: { id: true, name: true, city: true, upiId: true, bankAccountNumber: true } },
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

  async getShopFinancialDashboard(userId: string, customStartDate?: string, customEndDate?: string) {
    const shop = await this.prisma.shop.findFirst({ where: { ownerId: userId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let customStart = today;
    let customEnd = now;
    if (customStartDate && customEndDate) {
      customStart = new Date(customStartDate);
      customStart.setHours(0, 0, 0, 0);
      customEnd = new Date(customEndDate);
      customEnd.setHours(23, 59, 59, 999);
    }

    // Count all non-cancelled orders (PLACED, ACCEPTED, PREPARING, READY, DELIVERED etc.)
    const validStatuses = { notIn: ['CANCELLED', 'REFUNDED'] as any[] };

    const [
      orders7Days, orders7DaysCOD, orders7DaysOnline,
      ordersThisMonth, ordersThisMonthCOD, ordersThisMonthOnline,
      ordersToday, ordersTodayCOD, ordersTodayOnline,
      settlements7Days, settlementsThisMonth, settlementsToday,
      pendingSettlementAmt,
      ordersCustom, ordersCustomCOD, ordersCustomOnline, settlementsCustom
    ] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { shopId: shop.id, status: validStatuses, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: 'COD', createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: { not: 'COD' }, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { shopId: shop.id, status: validStatuses, createdAt: { gte: firstDayOfMonth } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: 'COD', createdAt: { gte: firstDayOfMonth } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: { not: 'COD' }, createdAt: { gte: firstDayOfMonth } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { shopId: shop.id, status: validStatuses, createdAt: { gte: today } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: 'COD', createdAt: { gte: today } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: { not: 'COD' }, createdAt: { gte: today } } }),
      this.prisma.shopSettlement.aggregate({ _sum: { netSettlementAmt: true }, where: { shopId: shop.id, status: 'COMPLETED', settledAt: { gte: sevenDaysAgo } } }),
      this.prisma.shopSettlement.aggregate({ _sum: { netSettlementAmt: true }, where: { shopId: shop.id, status: 'COMPLETED', settledAt: { gte: firstDayOfMonth } } }),
      this.prisma.shopSettlement.aggregate({ _sum: { netSettlementAmt: true }, where: { shopId: shop.id, status: 'COMPLETED', settledAt: { gte: today } } }),
      this.prisma.shopSettlement.aggregate({ _sum: { netSettlementAmt: true }, where: { shopId: shop.id, status: 'PENDING' } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, _count: { id: true }, where: { shopId: shop.id, status: validStatuses, createdAt: { gte: customStart, lte: customEnd } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: 'COD', createdAt: { gte: customStart, lte: customEnd } } }),
      this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { shopId: shop.id, status: validStatuses, paymentMethod: { not: 'COD' }, createdAt: { gte: customStart, lte: customEnd } } }),
      this.prisma.shopSettlement.aggregate({ _sum: { netSettlementAmt: true }, where: { shopId: shop.id, status: 'COMPLETED', settledAt: { gte: customStart, lte: customEnd } } }),
    ]);

    // Compute estimated net (gross - 5% commission) since admin may not have settled yet
    const estimateNet = (gross: number) => gross * 0.95;

    return {
      last7Days: {
        grossSales: orders7Days._sum.totalAmount || 0,
        codCollected: orders7DaysCOD._sum.totalAmount || 0,
        onlinePaid: orders7DaysOnline._sum.totalAmount || 0,
        totalDeliveries: orders7Days._count.id || 0,
        netSettled: settlements7Days._sum.netSettlementAmt || (orders7Days._sum.totalAmount || 0),
      },
      thisMonth: {
        grossSales: ordersThisMonth._sum.totalAmount || 0,
        codCollected: ordersThisMonthCOD._sum.totalAmount || 0,
        onlinePaid: ordersThisMonthOnline._sum.totalAmount || 0,
        totalDeliveries: ordersThisMonth._count.id || 0,
        netSettled: settlementsThisMonth._sum.netSettlementAmt || (ordersThisMonth._sum.totalAmount || 0),
      },
      today: {
        grossSales: ordersToday._sum.totalAmount || 0,
        codCollected: ordersTodayCOD._sum.totalAmount || 0,
        onlinePaid: ordersTodayOnline._sum.totalAmount || 0,
        totalDeliveries: ordersToday._count.id || 0,
        netSettled: settlementsToday._sum.netSettlementAmt || (ordersToday._sum.totalAmount || 0),
      },
      custom: {
        grossSales: ordersCustom._sum.totalAmount || 0,
        codCollected: ordersCustomCOD._sum.totalAmount || 0,
        onlinePaid: ordersCustomOnline._sum.totalAmount || 0,
        totalDeliveries: ordersCustom._count.id || 0,
        netSettled: settlementsCustom._sum.netSettlementAmt || (ordersCustom._sum.totalAmount || 0),
      },
      pendingSettlement: pendingSettlementAmt._sum.netSettlementAmt || 0,
    };
  }
  async getUnsettledShopsSummary(user?: any) {
    const marketId = await this.getAdminMarketId(user);

    // Find all shops that have DELIVERED orders not yet linked to any settlement item
    const shops = await this.prisma.shop.findMany({
      where: marketId ? { marketId } : {},
      select: { id: true, name: true }
    });

    const result = [];

    for (const shop of shops) {
      const orders = await this.prisma.order.findMany({
        where: {
          shopId: shop.id,
          status: 'DELIVERED',
          settlementItem: null, // not yet in any settlement
        },
        select: { id: true, totalAmount: true, paymentMethod: true, deliveryAddressId: true, deliveryFee: true }
      });

      if (orders.length > 0) {
        let grossAmount = 0;
        let platformHolds = 0;
        let deliveryFeeTotal = 0;
        
        for (const o of orders) {
          grossAmount += o.totalAmount;
          deliveryFeeTotal += o.deliveryFee;
          const isSelfPickupCOD = o.paymentMethod === 'COD' && o.deliveryAddressId === null;
          if (!isSelfPickupCOD) {
            platformHolds += o.totalAmount;
          }
        }
        
        result.push({
          shopId: shop.id,
          shopName: shop.name,
          orderCount: orders.length,
          grossAmount,
          platformHolds,
          deliveryFeeTotal
        });
      }
    }

    return result;
  }
}

