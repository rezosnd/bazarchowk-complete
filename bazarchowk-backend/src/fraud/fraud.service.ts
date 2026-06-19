import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Multiple Accounts Detection
   * Flags IP addresses that register more than 3 accounts in 24 hours.
   */
  async detectMultipleAccounts(ipAddress: string, deviceInfo: string): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Check sessions created from this IP recently
    const recentSessions = await this.prisma.session.count({
      where: {
        ipAddress,
        createdAt: { gte: twentyFourHoursAgo },
      }
    });

    if (recentSessions >= 3) {
      await this.logFraud({
        ipAddress,
        deviceInfo,
        fraudType: 'MULTIPLE_ACCOUNTS',
        riskScore: 85,
        description: `High registration volume (${recentSessions} accounts) from IP ${ipAddress} in 24 hours.`
      });
      return true; // Flagged as suspicious
    }

    return false;
  }

  /**
   * 2. Fake Order / Order Abuse Detection
   * Flags users who place and cancel multiple orders rapidly.
   */
  async checkFakeOrder(userId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const cancelledOrders = await this.prisma.order.count({
      where: {
        customerId: userId,
        status: 'CANCELLED',
        createdAt: { gte: oneHourAgo }
      }
    });

    if (cancelledOrders >= 3) {
      await this.logFraud({
        userId,
        fraudType: 'FAKE_ORDER',
        riskScore: 90,
        description: `User cancelled ${cancelledOrders} orders within the last hour.`
      });
      return true;
    }

    return false;
  }

  /**
   * 3. Coupon Abuse Detection
   * Prevents a device/IP from using a 'NEW_USER' coupon across multiple accounts.
   */
  async checkCouponAbuse(userId: string, couponCode: string, ipAddress: string): Promise<boolean> {
    // In a real scenario, this would query a CouponUsage table.
    // We check if this IP has used this specific coupon on another user account.
    
    // Example logic using Order table if coupon is stored in metadata or discount
    // For now, we simulate an abuse check.
    const previousUsagesByIp = await this.prisma.session.count({
      where: {
        ipAddress,
        userId: { not: userId }
      }
    });

    if (previousUsagesByIp > 0 && couponCode.toUpperCase().includes('NEW')) {
      await this.logFraud({
        userId,
        ipAddress,
        fraudType: 'COUPON_ABUSE',
        riskScore: 75,
        description: `Attempted to use NEW USER coupon from an IP address associated with older accounts.`
      });
      return true; // Flagged
    }

    return false;
  }

  /**
   * General Fraud Logger
   */
  async logFraud(data: { userId?: string; ipAddress?: string; deviceInfo?: string; fraudType: string; riskScore: number; description: string }) {
    this.logger.warn(`[FRAUD ALERT] Type: ${data.fraudType} | Score: ${data.riskScore} | ${data.description}`);
    
    await this.prisma.fraudLog.create({
      data: {
        userId: data.userId,
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
        fraudType: data.fraudType,
        riskScore: data.riskScore,
        description: data.description,
      }
    });
    
    // In production, trigger an alert to the Admin Queue/Dashboard here
  }
}
