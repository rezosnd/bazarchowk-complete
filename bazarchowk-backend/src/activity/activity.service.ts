import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordLoginDto, RecordSearchDto, RecordActivityDto } from './dto/activity.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async recordLogin(userId: string, dto: RecordLoginDto) {
    return this.prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        deviceOs: dto.deviceOs
      }
    });
  }

  async recordSearch(userId: string | null, dto: RecordSearchDto) {
    return this.prisma.searchHistory.create({
      data: {
        userId,
        query: dto.query,
        filters: dto.filters,
        results: dto.results || 0
      }
    });
  }

  async recordUserActivity(userId: string, dto: RecordActivityDto) {
    return this.prisma.userActivity.create({
      data: {
        userId,
        actionType: dto.actionType,
        entityId: dto.entityId,
        metadata: dto.metadata
      }
    });
  }

  // Analytics Fetchers
  async getLoginHistory(userId: string, limit: number = 20) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginTime: 'desc' },
      take: Number(limit)
    });
  }

  async getUserActivity(userId: string, limit: number = 50) {
    return this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });
  }

  // Admin Level Aggregations
  async getTopSearches(limit: number = 10) {
    // Standard PostgreSQL aggregation would be better raw SQL, but Prisma groupBy works well here.
    const grouped = await this.prisma.searchHistory.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: Number(limit)
    });

    return grouped.map(g => ({
      query: g.query,
      count: g._count.query
    }));
  }
}
