import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogDto } from './dto/audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs an administrative or critical system action.
   * This is called internally by other services (Orders, Users, Settings).
   */
  async logAction(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: dto
    });
  }

  /**
   * Fetch paginated audit logs for Admin Dashboard.
   */
  async getAuditLogs(entity?: string, action?: string, actorId?: string, limit: number = 50, offset: number = 0) {
    const whereClause: any = {};
    if (entity) whereClause.entity = entity;
    if (action) whereClause.action = action;
    if (actorId) whereClause.actorId = actorId;

    return this.prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });
  }

  /**
   * Get audit history for a specific entity (e.g. tracking changes on an Order)
   */
  async getEntityHistory(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
