import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettlementService } from './settlement.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SettlementAutomationService {
  private readonly logger = new Logger(SettlementAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly settlementService: SettlementService
  ) {}

  /**
   * Generates a batch of settlements for all active shops for a given time period
   */
  async generateSettlementBatch(frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY', periodStart: Date, periodEnd: Date) {
    this.logger.log(`Generating ${frequency} settlement batch for period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    
    // Create the pending batch
    const batch = await this.prisma.settlementBatch.create({
      data: {
        frequency,
        periodStart,
        periodEnd,
        status: 'PROCESSING'
      }
    });

    try {
      // Find all shops that have delivered, unsettled orders in this period
      const unsettledOrders = await this.prisma.order.groupBy({
        by: ['shopId'],
        where: {
          status: 'DELIVERED',
          createdAt: { gte: periodStart, lte: periodEnd },
          settlementItem: null
        }
      });

      let totalShops = 0;
      let totalGross = 0;
      let totalPlatformFee = 0;
      let totalNetPayable = 0;

      for (const group of unsettledOrders) {
        // Use the existing core service logic to create individual shop settlements
        // We bypass the HTTP layer and construct a simulated DTO
        const shopSettlement = await this.settlementService.createShopSettlement('SYSTEM_AUTOMATION', {
          shopId: group.shopId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString()
        });

        // Link the shop settlement to this batch
        await this.prisma.shopSettlement.update({
          where: { id: shopSettlement.id },
          data: { batchId: batch.id }
        });

        // Also generate the report metadata row
        await this.prisma.settlementReport.create({
          data: {
            batchId: batch.id,
            shopId: group.shopId,
            totalOrders: shopSettlement.items.length,
            grossRevenue: shopSettlement.totalOrderAmount,
            commissionDeducted: shopSettlement.platformCommission,
            deliveryFeeDeducted: shopSettlement.deliveryFeeTotal,
            netPayout: shopSettlement.netSettlementAmt
          }
        });

        totalShops++;
        totalGross += shopSettlement.totalOrderAmount;
        totalPlatformFee += shopSettlement.platformCommission;
        totalNetPayable += shopSettlement.netSettlementAmt;
      }

      // Finalize batch stats
      const finalizedBatch = await this.prisma.settlementBatch.update({
        where: { id: batch.id },
        data: {
          status: 'PENDING', // Pending Admin Approval
          totalShops,
          totalAmount: totalGross,
          platformFee: totalPlatformFee,
          netPayable: totalNetPayable
        }
      });

      this.logger.log(`Successfully generated batch ${finalizedBatch.batchNumber} with ${totalShops} shops.`);
      
      // Notify Super Admins to approve the batch
      // Real implementation would look up admins; here we log
      this.logger.log(`Action Required: Batch ${finalizedBatch.batchNumber} requires approval.`);

      return finalizedBatch;
    } catch (error) {
      this.logger.error(`Failed to process batch ${batch.batchNumber}:`, error.stack);
      await this.prisma.settlementBatch.update({
        where: { id: batch.id },
        data: { status: 'FAILED' }
      });
      throw error;
    }
  }

  /**
   * Admin approves a settlement batch, which notifies shops and marks it ready for payment
   */
  async approveSettlementBatch(adminId: string, batchId: string) {
    const batch = await this.prisma.settlementBatch.findUnique({
      where: { id: batchId },
      include: { shopSettlements: { include: { shop: true } } }
    });

    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status !== 'PENDING') throw new BadRequestException('Batch is not pending approval');

    // Approve the batch
    const approvedBatch = await this.prisma.settlementBatch.update({
      where: { id: batchId },
      data: {
        status: 'APPROVED',
        approvedById: adminId,
        approvedAt: new Date()
      }
    });

    // Notify all affected shops that their settlement is approved and processing
    for (const settlement of batch.shopSettlements) {
      await this.notificationsService.sendInAppNotification(
        settlement.shop.ownerId,
        'Settlement Approved',
        `Your settlement for ₹${settlement.netSettlementAmt.toFixed(2)} is approved and will be credited soon.`,
        'SYSTEM'
      );
    }

    return approvedBatch;
  }

  /**
   * Retrieve automation batches for Admin UI
   */
  async getSettlementBatches(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.settlementBatch.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { approvedBy: { select: { firstName: true, lastName: true } } }
      }),
      this.prisma.settlementBatch.count()
    ]);
    return { data, total, page, limit };
  }

  /**
   * CRON: Daily Automated Settlement Generation at 1:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailySettlements() {
    this.logger.log('CRON: Triggering Daily Settlement Batch');
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0); // Start of yesterday

    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999); // End of yesterday

    await this.generateSettlementBatch('DAILY', start, end);
  }
}
