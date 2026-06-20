import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Log Raw Event from Frontend (Now mapped to UserActivity from Module 33)
  async logEvent(eventName: string, data: { userId?: string; entityId?: string; metadata?: any }) {
    if (!data.userId) return; // Anonymous tracking falls back to SearchHistory
    return this.prisma.userActivity.create({
      data: {
        actionType: eventName,
        userId: data.userId,
        entityId: data.entityId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      }
    });
  }

  // 1.5 Admin Dashboard Metrics
  async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const revenue = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { createdAt: { gte: today }, status: 'DELIVERED' }
    });

    const totalOrders = await this.prisma.order.count();
    
    let activeRiders = 0;
    const riderRole = await this.prisma.role.findUnique({ where: { name: 'RIDER' } });
    if (riderRole) {
      activeRiders = await this.prisma.user.count({ where: { roleId: riderRole.id } });
    }

    return {
      totalRevenue: revenue._sum.totalAmount || 0,
      totalOrders,
      activeRiders
    };
  }


  // 2. Global Platform Revenue
  async getGlobalRevenue(startDate: Date, endDate: Date) {
    const orders = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['DELIVERED'] }
      }
    });

    const totalOrders = await this.prisma.order.count({
      where: { createdAt: { gte: startDate, lte: endDate }, status: 'DELIVERED' }
    });

    return {
      revenue: orders._sum.totalAmount || 0,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? (orders._sum.totalAmount || 0) / totalOrders : 0
    };
  }

  // 3. DAU and MAU Tracking (Using LoginHistory)
  async getActiveUsers() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dauQuery = await this.prisma.loginHistory.groupBy({
      by: ['userId'],
      where: { loginTime: { gte: oneDayAgo } }
    });

    const mauQuery = await this.prisma.loginHistory.groupBy({
      by: ['userId'],
      where: { loginTime: { gte: thirtyDaysAgo } }
    });

    return {
      DAU: dauQuery.length,
      MAU: mauQuery.length,
    };
  }

  // 4. Funnel Analytics
  async getFunnelMetrics() {
    const appOpens = await this.prisma.userActivity.count({ where: { actionType: 'APP_OPEN' } });
    const cartAdds = await this.prisma.userActivity.count({ where: { actionType: 'ADD_TO_CART' } });
    const checkouts = await this.prisma.userActivity.count({ where: { actionType: 'CHECKOUT_STARTED' } });
    const orders = await this.prisma.order.count();

    return {
      step1_AppOpens: appOpens,
      step2_CartAdds: cartAdds,
      step3_Checkouts: checkouts,
      step4_OrdersPlaced: orders,
      conversionRate: appOpens > 0 ? ((orders / appOpens) * 100).toFixed(2) + '%' : '0%'
    };
  }

  // 5. Partner / Shop Dashboard
  async getShopAnalytics(shopId: string, startDate: Date, endDate: Date) {
    const revenue = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { shopId, createdAt: { gte: startDate, lte: endDate }, status: 'DELIVERED' }
    });

    const totalOrders = await this.prisma.order.count({
      where: { shopId, createdAt: { gte: startDate, lte: endDate }, status: 'DELIVERED' }
    });

    const profileViews = await this.prisma.userActivity.count({
      where: { entityId: shopId, actionType: 'PROFILE_VIEW', createdAt: { gte: startDate, lte: endDate } }
    });

    return {
      revenue: revenue._sum.totalAmount || 0,
      totalOrders,
      profileViews
    };
  }
}
