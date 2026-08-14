import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMarketDto, UpdateMarketDto, CreateCityConfigDto } from './dto/super-admin.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private async getAdminMarketId(user: any): Promise<string | undefined> {
    if (!user || user.role?.name === 'SUPER_ADMIN') return undefined;
    const adminUser = await this.prisma.user.findUnique({
      where: { id: user.id || user.userId },
      include: { managedMarket: true }
    });
    return adminUser?.managedMarket?.id;
  }

  // ==================== PLATFORM DASHBOARD ====================

  async getPlatformOverview(user: any) {
    try {
      const marketId = await this.getAdminMarketId(user);
      
      const shopWhere = marketId ? { marketId } : {};
      const orderWhere = marketId ? { shop: { marketId } } : {};
      const deliveryPartnerWhere = marketId ? { marketId, isOnline: true } : { isOnline: true };
      
      const [
        totalUsers,
        totalShops,
        totalOrders,
        totalRevenue,
        pendingShopVerifications,
        pendingAdApprovals,
        activeDeliveryPartners,
        openSupportTickets,
        recentFraudLogs,
      ] = await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.shop.count({ where: shopWhere }),
        this.prisma.order.count({ where: orderWhere }),
        this.prisma.order.aggregate({ _sum: { totalAmount: true }, where: { ...orderWhere, status: 'DELIVERED' } }),
        this.prisma.shop.count({ where: { ...shopWhere, isVerified: false, isActive: true } }),
        this.prisma.advertisement.count({ where: { status: 'PENDING' } }),
        this.prisma.deliveryPartner.count({ where: deliveryPartnerWhere }),
        this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        this.prisma.fraudLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      ]);

      return {
        users: { total: totalUsers },
        shops: { total: totalShops, pendingVerification: pendingShopVerifications },
        orders: { total: totalOrders },
        revenue: { total: totalRevenue._sum.totalAmount || 0 },
        ads: { pendingApproval: pendingAdApprovals },
        delivery: { onlinePartners: activeDeliveryPartners },
        support: { openTickets: openSupportTickets },
        recentFraudAlerts: recentFraudLogs,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve dashboard overview');
    }
  }

  // ==================== USER MANAGEMENT ====================

  async getAllUsers(page: number, limit: number, search?: string, user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    
    // Note: Filtering users by market is complex since users don't have a direct marketId.
    // For now, if marketId is present, we only show users who are riders/shops in that market.
    if (marketId) {
      where.OR = [
        { shops: { some: { marketId } } },
        { deliveryPartner: { marketId } }
      ];
    }
    
    if (search) {
      const searchOR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { firstName: { contains: search, mode: 'insensitive' } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOR }];
        delete where.OR;
      } else {
        where.OR = searchOR;
      }
    }
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: limit,
        include: { role: true, _count: { select: { customerOrders: true, shops: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, total, page, limit };
  }

  async banUser(userId: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    if (adminId) {
      await this.auditService.logAction({
        actorId: adminId,
        action: 'BAN_USER',
        entity: 'User',
        entityId: userId,
        newValue: JSON.stringify({ isActive: false }),
        ipAddress: 'System',
      });
    }
    return updated;
  }

  async unbanUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  async assignRole(userId: string, roleName: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      role = await this.prisma.role.create({ data: { name: roleName } });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true }
    });

    if (adminId) {
      await this.auditService.logAction({
        actorId: adminId,
        action: 'ASSIGN_ROLE',
        entity: 'User',
        entityId: userId,
        oldValue: JSON.stringify({ roleId: user.roleId }),
        newValue: JSON.stringify({ roleId: role.id, roleName }),
        ipAddress: 'System',
      });
    }

    return updated;
  }

  // ==================== SHOP MANAGEMENT ====================

  async getAllShops(page: number, limit: number, verified?: boolean, user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (verified !== undefined) where.isVerified = verified;
    if (marketId) where.marketId = marketId;
    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where, skip, take: limit,
        include: {
          owner: { select: { id: true, firstName: true, email: true, phone: true } },
          _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);
    return { data: shops, total, page, limit };
  }

  async verifyShop(shopId: string, adminId?: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: { isVerified: true },
    });
    if (adminId) {
      await this.auditService.logAction({
        actorId: adminId,
        action: 'VERIFY_SHOP',
        entity: 'Shop',
        entityId: shopId,
        newValue: JSON.stringify({ isVerified: true }),
        ipAddress: 'System',
      });
    }
    return updated;
  }

  async suspendShop(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    return this.prisma.shop.update({
      where: { id: shopId },
      data: { isActive: false },
    });
  }

  // ==================== ORDER MANAGEMENT ====================

  async getAllOrders(page: number, limit: number, status?: string, user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (marketId) where.shop = { marketId };
    
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take: limit,
        include: {
          customer: { select: { firstName: true, email: true, phone: true } },
          shop: { select: { name: true, city: true } },
          rider: { select: { firstName: true, lastName: true, phone: true } },
          items: { include: { productVariant: { include: { product: true } } } },
          statusHistory: { orderBy: { createdAt: 'desc' } },
          trackingPoints: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: orders, total, page, limit };
  }

  // ==================== REVENUE & SETTLEMENT MANAGEMENT ====================

  async getAllSettlements(page: number, limit: number, status?: string, user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (marketId) where.shop = { marketId };

    const [settlements, total] = await Promise.all([
      this.prisma.shopSettlement.findMany({
        where, skip, take: limit,
        include: {
          shop: { select: { name: true, owner: { select: { phone: true } } } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shopSettlement.count({ where }),
    ]);
    return { data: settlements, total, page, limit };
  }

  async getRevenueReport(startDate: Date, endDate: Date, groupBy: 'day' | 'month' = 'day', user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const orderWhere: any = { status: 'DELIVERED', createdAt: { gte: startDate, lte: endDate } };
    if (marketId) orderWhere.shop = { marketId };

    const [orders, topShopsRaw, totalOrderCount, totalCodAgg, totalOnlineAgg] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['createdAt'],
        _sum: { totalAmount: true },
        _count: { id: true },
        where: orderWhere,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.order.groupBy({
        by: ['shopId'],
        _sum: { totalAmount: true },
        _count: { id: true },
        where: orderWhere,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      }),
      this.prisma.order.count({
        where: orderWhere
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { ...orderWhere, paymentMethod: 'COD' }
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { ...orderWhere, paymentMethod: { not: 'COD' } }
      }),
    ]);

    // Enrich topShops with shop names
    const shopIds = topShopsRaw.map(s => s.shopId);
    const shops = await this.prisma.shop.findMany({
      where: { id: { in: shopIds } },
      select: { id: true, name: true, city: true, logoUrl: true }
    });
    const shopMap = new Map(shops.map(s => [s.id, s]));
    const topShops = topShopsRaw.map(s => ({
      ...s,
      shop: shopMap.get(s.shopId) || { id: s.shopId, name: 'Unknown Shop', city: '' }
    }));

    const totalRevenue = orders.reduce((sum, o) => sum + (o._sum.totalAmount || 0), 0);
    const totalCod = totalCodAgg._sum.totalAmount || 0;
    const totalOnline = totalOnlineAgg._sum.totalAmount || 0;

    return { dailyRevenue: orders, topShops, totalRevenue, totalOrderCount, totalCod, totalOnline };
  }

  // ==================== ADVERTISEMENT MANAGEMENT ====================

  async getPendingAds() {
    return this.prisma.advertisement.findMany({
      where: { status: 'PENDING' },
      include: { shop: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveAd(adId: string) {
    const ad = await this.prisma.advertisement.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Advertisement not found');
    return this.prisma.advertisement.update({
      where: { id: adId },
      data: { status: 'ACTIVE', startDate: new Date() },
    });
  }

  async rejectAd(adId: string) {
    const ad = await this.prisma.advertisement.findUnique({ where: { id: adId } });
    if (!ad) throw new NotFoundException('Advertisement not found');
    return this.prisma.advertisement.update({
      where: { id: adId },
      data: { status: 'REJECTED' },
    });
  }

  // ==================== DELIVERY NETWORK MANAGEMENT ====================

  async getDeliveryNetwork(page: number, limit: number, user?: any) {
    const marketId = await this.getAdminMarketId(user);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (marketId) where.marketId = marketId;
    
    const [partners, total] = await Promise.all([
      this.prisma.deliveryPartner.findMany({
        where, skip, take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true, email: true, kycStatus: true } },
          _count: { select: { deliveries: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deliveryPartner.count(),
    ]);
    return { data: partners, total, page, limit };
  }

  async verifyDeliveryPartner(partnerId: string, adminId?: string) {
    const partner = await this.prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
      include: { user: true }
    });
    
    if (!partner) throw new NotFoundException('Delivery partner not found');

    const updatedUser = await this.prisma.user.update({
      where: { id: partner.userId },
      data: { kycStatus: 'VERIFIED' }
    });

    if (adminId) {
      await this.auditService.logAction({
        actorId: adminId,
        action: 'VERIFY_RIDER',
        entity: 'User',
        entityId: partner.userId,
        newValue: JSON.stringify({ kycStatus: 'VERIFIED' }),
        ipAddress: 'System',
      });
    }

    return updatedUser;
  }

  // ==================== FRAUD MANAGEMENT ====================

  async getFraudLogs(page: number, limit: number, resolved?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (resolved !== undefined) where.isResolved = resolved;
    const [logs, total] = await Promise.all([
      this.prisma.fraudLog.findMany({
        where, skip, take: limit,
        include: { user: { select: { firstName: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fraudLog.count({ where }),
    ]);
    return { data: logs, total, page, limit };
  }

  async resolveFraudLog(fraudLogId: string) {
    const log = await this.prisma.fraudLog.findUnique({ where: { id: fraudLogId } });
    if (!log) throw new NotFoundException('Fraud log not found');
    return this.prisma.fraudLog.update({
      where: { id: fraudLogId },
      data: { isResolved: true },
    });
  }

  // ==================== MARKET MANAGEMENT ====================

  async createMarket(dto: CreateMarketDto) {
    const village = await this.prisma.village.findUnique({ where: { id: dto.villageId } });
    if (!village) throw new NotFoundException('Village not found');
    
    return this.prisma.market.create({
      data: dto
    });
  }

  async getMarkets(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    const [markets, total] = await Promise.all([
      this.prisma.market.findMany({ where, skip, take: limit, include: { village: true } }),
      this.prisma.market.count({ where })
    ]);
    return { data: markets, total, page, limit };
  }

  async updateMarket(id: string, dto: UpdateMarketDto) {
    const market = await this.prisma.market.findUnique({ where: { id } });
    if (!market) throw new NotFoundException('Market not found');
    return this.prisma.market.update({ where: { id }, data: dto });
  }

  // ==================== CITY CONFIG MANAGEMENT ====================

  async createCityConfig(dto: CreateCityConfigDto) {
    const existing = await this.prisma.cityConfig.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('City with this slug already exists');
    return this.prisma.cityConfig.create({ data: dto });
  }

  async getCities(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [cities, total] = await Promise.all([
      this.prisma.cityConfig.findMany({ skip, take: limit }),
      this.prisma.cityConfig.count()
    ]);
    return { data: cities, total, page, limit };
  }

  // ==================== SUPER ADMIN ACTIONS LOGGING ====================

  async recordAction(adminId: string, actionType: string, targetId: string, targetType: string, reason?: string, metadata?: any, ipAddress?: string) {
    return this.prisma.superAdminAction.create({
      data: {
        adminId,
        actionType,
        targetId,
        targetType,
        reason,
        metadata: metadata ? metadata : undefined,
        ipAddress,
      }
    });
  }

  async getAdminActions(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [actions, total] = await Promise.all([
      this.prisma.superAdminAction.findMany({
        skip, take: limit,
        include: { admin: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.superAdminAction.count()
    ]);
    return { data: actions, total, page, limit };
  }

  // ==================== PLATFORM REPORTS ====================

  async generatePlatformReport(adminId: string, title: string, reportType: string, startDate: Date, endDate: Date, data: any) {
    return this.prisma.platformReport.create({
      data: {
        title,
        reportType,
        data,
        generatedBy: adminId,
        startDate,
        endDate
      }
    });
  }

  async getPlatformReports(page: number, limit: number, reportType?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (reportType) where.reportType = reportType;

    const [reports, total] = await Promise.all([
      this.prisma.platformReport.findMany({
        where, skip, take: limit,
        include: { generator: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.platformReport.count({ where })
    ]);
    return { data: reports, total, page, limit };
  }

  // ==================== OPERATIONAL LOGS ====================

  async getOperationalLogs(page: number, limit: number, severity?: string, moduleName?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (severity) where.severity = severity;
    if (moduleName) where.module = moduleName;

    const [logs, total] = await Promise.all([
      this.prisma.operationalLog.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.operationalLog.count({ where })
    ]);
    return { data: logs, total, page, limit };
  }

  async resolveOperationalLog(id: string) {
    const log = await this.prisma.operationalLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Operational log not found');
    return this.prisma.operationalLog.update({
      where: { id },
      data: { isResolved: true }
    });
  }

  // ==================== CASH COLLECTION MONITORING ====================

  async getCashCollections(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [collections, total] = await Promise.all([
      this.prisma.cashCollection.findMany({
        where, skip, take: limit,
        include: { 
          rider: { select: { firstName: true, lastName: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.cashCollection.count({ where })
    ]);
    return { data: collections, total, page, limit };
  }

  // ==================== SYSTEM ERROR LOGS ====================

  async getSystemErrorLogs(page: number, limit: number, statusCode?: number) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (statusCode) where.statusCode = statusCode;

    const [logs, total] = await Promise.all([
      this.prisma.systemErrorLog.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.systemErrorLog.count({ where })
    ]);
    return { data: logs, total, page, limit };
  }
}
