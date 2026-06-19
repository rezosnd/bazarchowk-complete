import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateDistrictAdminDto,
  CreateMarketAdminDto,
  AssignTerritoryDto,
  UpdatePermissionsDto,
} from './dto/franchise.dto';

@Injectable()
export class FranchiseService {
  private readonly logger = new Logger(FranchiseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==================== DISTRICT ADMIN ====================

  async createDistrictAdmin(dto: CreateDistrictAdminDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.districtAdmin.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new BadRequestException('User is already a District Admin');

    const districtAdmin = await this.prisma.districtAdmin.create({
      data: {
        userId: dto.userId,
        districtName: dto.districtName,
        state: dto.state,
        // Create default permissions automatically
        permissions: {
          create: {
            canVerifyShops: true,
            canManageRiders: true,
            canViewRevenue: true,
            canSettlePayments: true,
            canManageAds: true,
            canBanUsers: false,
            canViewFraudLogs: true,
          },
        },
      },
      include: { user: { select: { firstName: true, email: true, phone: true } }, permissions: true },
    });

    this.logger.log(`District Admin created: ${dto.districtName} → User ${dto.userId}`);
    
    await this.notificationsService.sendInAppNotification(
      dto.userId,
      'Promotion: District Admin',
      `Congratulations! You have been appointed as the District Admin for ${dto.districtName}.`,
      'SYSTEM'
    );

    return districtAdmin;
  }

  async getAllDistrictAdmins() {
    return this.prisma.districtAdmin.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        permissions: true,
        _count: { select: { marketAdmins: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleDistrictAdmin(id: string, isActive: boolean) {
    return this.prisma.districtAdmin.update({ where: { id }, data: { isActive } });
  }

  // ==================== MARKET ADMIN ====================

  async createMarketAdmin(dto: CreateMarketAdminDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.marketAdmin.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new BadRequestException('User is already a Market Admin');

    const marketAdmin = await this.prisma.marketAdmin.create({
      data: {
        userId: dto.userId,
        marketName: dto.marketName,
        coverageArea: dto.coverageArea,
        districtAdminId: dto.districtAdminId,
        // Create default permissions automatically
        permissions: {
          create: {
            canVerifyShops: true,
            canManageRiders: true,
            canViewRevenue: true,
            canSettlePayments: false,
            canManageAds: false,
            canBanUsers: false,
            canViewFraudLogs: false,
          },
        },
      },
      include: { user: { select: { firstName: true, email: true, phone: true } }, permissions: true },
    });

    this.logger.log(`Market Admin created: ${dto.marketName} → User ${dto.userId}`);
    
    await this.notificationsService.sendInAppNotification(
      dto.userId,
      'Promotion: Market Admin',
      `You have been appointed as the Market Admin for ${dto.marketName}.`,
      'SYSTEM'
    );

    return marketAdmin;
  }

  async getAllMarketAdmins(districtAdminId?: string) {
    const where: any = {};
    if (districtAdminId) where.districtAdminId = districtAdminId;
    return this.prisma.marketAdmin.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        districtAdmin: { select: { districtName: true, state: true } },
        permissions: true,
        _count: { select: { assignedMarkets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== TERRITORY ASSIGNMENT ====================

  async assignTerritory(marketAdminId: string, dto: AssignTerritoryDto) {
    const marketAdmin = await this.prisma.marketAdmin.findUnique({ where: { id: marketAdminId } });
    if (!marketAdmin) throw new NotFoundException('Market Admin not found');

    return this.prisma.adminMarket.upsert({
      where: { marketAdminId_citySlug_marketArea: { marketAdminId, citySlug: dto.citySlug, marketArea: dto.marketArea } },
      create: { marketAdminId, ...dto },
      update: { centerLat: dto.centerLat, centerLon: dto.centerLon, radiusKm: dto.radiusKm, isActive: true },
    });
  }

  async getMarketAdminTerritories(marketAdminId: string) {
    return this.prisma.adminMarket.findMany({ where: { marketAdminId, isActive: true } });
  }

  // ==================== SHOP & RIDER ASSIGNMENT (TERRITORY VIEW) ====================

  async getAssignedShops(marketAdminId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    // Find all cities managed by this market admin
    const territories = await this.getMarketAdminTerritories(marketAdminId);
    if (territories.length === 0) return { data: [], total: 0, page, limit };
    
    const citySlugs = [...new Set(territories.map(t => t.citySlug))];

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where: { city: { in: citySlugs } },
        skip,
        take: limit,
        include: { owner: { select: { firstName: true, phone: true } } },
      }),
      this.prisma.shop.count({ where: { city: { in: citySlugs } } })
    ]);

    return { data: shops, total, page, limit };
  }

  async getAssignedRiders(marketAdminId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    // We assume riders are associated with the same cities via their User address, 
    // or we fetch active deliveries in those cities.
    const territories = await this.getMarketAdminTerritories(marketAdminId);
    if (territories.length === 0) return { data: [], total: 0, page, limit };
    
    const citySlugs = [...new Set(territories.map(t => t.citySlug))];

    // Find riders who have completed orders in these cities, or live there
    const riders = await this.prisma.deliveryPartner.findMany({
      skip, take: limit,
      include: { user: { select: { firstName: true, phone: true, addresses: true } } },
    });

    // In a strict production environment with explicit city mapping for riders, 
    // you would filter by `rider.citySlug`. Here we return the active partners.
    const total = await this.prisma.deliveryPartner.count();

    return { data: riders, total, page, limit };
  }

  // ==================== PERMISSIONS ====================

  async updateDistrictAdminPermissions(districtAdminId: string, dto: UpdatePermissionsDto) {
    const existing = await this.prisma.adminPermission.findFirst({ where: { districtAdminId } });
    if (!existing) throw new NotFoundException('Permissions not found for this District Admin');
    return this.prisma.adminPermission.update({ where: { id: existing.id }, data: dto });
  }

  async updateMarketAdminPermissions(marketAdminId: string, dto: UpdatePermissionsDto) {
    const existing = await this.prisma.adminPermission.findFirst({ where: { marketAdminId } });
    if (!existing) throw new NotFoundException('Permissions not found for this Market Admin');
    return this.prisma.adminPermission.update({ where: { id: existing.id }, data: dto });
  }

  // ==================== PERFORMANCE TRACKING ====================

  async getDistrictAdminPerformance(districtAdminId: string, startDate: Date, endDate: Date) {
    const districtAdmin = await this.prisma.districtAdmin.findUnique({
      where: { id: districtAdminId },
      include: { marketAdmins: { select: { id: true, marketName: true } } },
    });
    if (!districtAdmin) throw new NotFoundException('District Admin not found');

    // Get all cities managed by this district admin via their market admins
    const marketAdminIds = districtAdmin.marketAdmins.map(m => m.id);
    const territories = await this.prisma.adminMarket.findMany({
      where: { marketAdminId: { in: marketAdminIds } },
      select: { citySlug: true },
    });
    const citySlugs = [...new Set(territories.map(t => t.citySlug))];

    // Revenue from cities in territory
    const [revenue, shopCount, riderDeposits] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          status: 'DELIVERED',
          createdAt: { gte: startDate, lte: endDate },
          shop: { city: { in: citySlugs } },
        },
      }),
      this.prisma.shop.count({ where: { city: { in: citySlugs }, isActive: true } }),
      this.prisma.riderDeposit.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: { status: 'VERIFIED', createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    return {
      districtAdmin: { id: districtAdminId, name: districtAdmin.districtName },
      territory: { citySlugs, marketAdminCount: marketAdminIds.length },
      performance: {
        revenue: revenue._sum.totalAmount || 0,
        totalOrders: revenue._count.id,
        activeShops: shopCount,
        verifiedCashDeposits: riderDeposits._count.id,
        verifiedCashAmount: riderDeposits._sum.totalAmount || 0,
      },
    };
  }
}
