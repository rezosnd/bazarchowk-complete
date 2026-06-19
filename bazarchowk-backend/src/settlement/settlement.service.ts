import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
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
  ) {}

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

  async getPendingDeposits() {
    return this.prisma.riderDeposit.findMany({
      where: { status: 'PENDING' },
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
    const commissionPct = dto.commissionPercent ?? 5;
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
      include: { shop: { select: { ownerId: true, name: true } } },
    });

    // Notify Shop Owner
    await this.notificationsService.sendInAppNotification(
      updatedSettlement.shop.ownerId,
      'Settlement Paid',
      `Your settlement of ₹${updatedSettlement.netSettlementAmt.toFixed(2)} has been paid. Ref: ${dto.paymentReference}`,
      'SYSTEM'
    );

    return updatedSettlement;
  }

  async getSettlements(shopId?: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (status) where.status = status;

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
}
