import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceService } from '../finance/finance.service';
import { SubmitCashDto, VerifyCashDto } from './dto/cash-verification.dto';

@Injectable()
export class CashVerificationService {
  private readonly logger = new Logger(CashVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly financeService: FinanceService
  ) {}

  // Calculate exactly how much cash the rider SHOULD have based on COD orders today
  private async calculateExpectedAmount(riderId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const codOrders = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        riderId,
        status: 'DELIVERED',
        paymentMethod: 'COD',
        createdAt: { gte: today }
      }
    });

    return codOrders._sum?.totalAmount || 0;
  }

  // 1. Rider initiates the cash drop-off
  async submitCash(riderId: string, dto: SubmitCashDto) {
    const expectedAmount = await this.calculateExpectedAmount(riderId);

    const verification = await this.prisma.cashVerification.create({
      data: {
        riderId,
        expectedAmount,
        submittedAmount: dto.submittedAmount,
        status: 'PENDING'
      }
    });

    return verification;
  }

  // 2. Market Admin physical count and verification
  async verifyCash(adminId: string, verificationId: string, dto: VerifyCashDto) {
    const verification = await this.prisma.cashVerification.findUnique({
      where: { id: verificationId },
      include: { rider: true }
    });

    if (!verification) throw new NotFoundException('Verification record not found');
    if (verification.status !== 'PENDING') throw new BadRequestException('Cash is already verified or disputed');

    const discrepancy = dto.verifiedAmount - verification.expectedAmount;
    
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cashVerification.update({
        where: { id: verificationId },
        data: {
          marketAdminId: adminId,
          verifiedAmount: dto.verifiedAmount,
          discrepancy,
          status: 'VERIFIED'
        }
      });

      // Handle Shortage
      if (discrepancy < 0) {
        await tx.cashShortage.create({
          data: {
            riderId: verification.riderId,
            verificationId: verification.id,
            shortageAmount: Math.abs(discrepancy),
            reason: 'Counted cash is less than expected COD collections'
          }
        });
        
        // Notify Rider
        await this.notificationsService.sendInAppNotification(
          verification.riderId,
          'Cash Shortage Detected',
          `Your cash deposit was short by ₹${Math.abs(discrepancy)}. This has been logged for review.`,
          'SYSTEM'
        );
      }

      // Handle Excess
      if (discrepancy > 0) {
        await this.notificationsService.sendInAppNotification(
          verification.riderId,
          'Excess Cash Deposited',
          `You deposited ₹${discrepancy} more than expected. This has been recorded.`,
          'SYSTEM'
        );
      }

      // Generate Official Receipt
      const receipt = await tx.cashReceipt.create({
        data: {
          verificationId: verification.id,
          riderId: verification.riderId,
          amount: dto.verifiedAmount
        }
      });

      // Notify Rider of Successful Deposit
      await this.notificationsService.sendInAppNotification(
        verification.riderId,
        'Cash Deposit Successful',
        `Your deposit of ₹${dto.verifiedAmount} has been verified and receipt #${receipt.receiptNumber} generated.`,
        'SYSTEM'
      );

      // Post to the Accounting & Finance Module
      await this.financeService.recordLedgerEntry(
        'Rider Cash Deposits',
        dto.verifiedAmount,
        'CASH_COLLECTION',
        verification.id,
        `Cash deposit verified by Admin ${adminId} for Rider ${verification.riderId}`
      );

      this.logger.log(`Cash Verified: Rider ${verification.riderId} - Expected: ${verification.expectedAmount}, Counted: ${dto.verifiedAmount}`);

      return { verification: updated, receipt };
    }, { isolationLevel: 'Serializable' });
  }

  // Retrieve verification history for a rider
  async getRiderHistory(riderId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.cashVerification.findMany({
        where: { riderId },
        skip, take: limit,
        include: { receipt: true },
        orderBy: { date: 'desc' }
      }),
      this.prisma.cashVerification.count({ where: { riderId } })
    ]);
    return { data, total, page, limit };
  }

  // Dashboard view for Market Admins to see pending drops
  async getPendingVerifications(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.cashVerification.findMany({
        where: { status: 'PENDING' },
        skip, take: limit,
        include: { rider: { select: { firstName: true, lastName: true, phone: true } } },
        orderBy: { date: 'asc' }
      }),
      this.prisma.cashVerification.count({ where: { status: 'PENDING' } })
    ]);
    return { data, total, page, limit };
  }

  // Daily Reconciliation Report for System/Admin
  async generateDailyReconciliationReport(dateString: string) {
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const verifications = await this.prisma.cashVerification.findMany({
      where: {
        date: { gte: targetDate, lt: nextDate },
        status: 'VERIFIED'
      },
      include: { 
        rider: { select: { firstName: true, lastName: true, phone: true } },
        marketAdmin: { select: { firstName: true, lastName: true } }
      }
    });

    const totalExpected = verifications.reduce((sum, v) => sum + v.expectedAmount, 0);
    const totalVerified = verifications.reduce((sum, v) => sum + (v.verifiedAmount || 0), 0);
    const totalShortage = verifications.filter(v => (v.discrepancy || 0) < 0).reduce((sum, v) => sum + Math.abs(v.discrepancy || 0), 0);
    const totalExcess = verifications.filter(v => (v.discrepancy || 0) > 0).reduce((sum, v) => sum + (v.discrepancy || 0), 0);

    return {
      date: targetDate,
      summary: {
        totalVerifications: verifications.length,
        totalExpected,
        totalVerified,
        totalShortage,
        totalExcess
      },
      verifications
    };
  }

  // View All Shortages
  async getShortages(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const whereClause = status ? { status } : {};
    
    const [data, total] = await Promise.all([
      this.prisma.cashShortage.findMany({
        where: whereClause,
        skip, take: limit,
        include: { rider: { select: { firstName: true, lastName: true, phone: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.cashShortage.count({ where: whereClause })
    ]);
    
    return { data, total, page, limit };
  }
}
