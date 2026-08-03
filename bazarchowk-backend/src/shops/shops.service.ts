import { Injectable, Inject, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { CreateShopTimingDto, BulkUpdateTimingsDto, CreateShopHolidayDto } from './dto/create-shop-timing.dto';
import { CreateShopDocumentDto } from './dto/create-shop-document.dto';

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ==================== SHOP CRUD ====================

  async create(ownerId: string, createShopDto: CreateShopDto) {
    const data: any = { ...createShopDto, ownerId };
    if (createShopDto.partnerType) {
      data.partnerType = createShopDto.partnerType as any;
    }

    const shop = await this.prisma.shop.create({
      data,
    });

    const ownerRole = await this.prisma.role.findUnique({ where: { name: 'SHOP_OWNER' } });
    if (ownerRole) {
      await this.prisma.user.update({ where: { id: ownerId }, data: { roleId: ownerRole.id } });
    }

    await this.notifications.sendInAppNotification(
      ownerId, 'Shop Created',
      `Your shop "${shop.name}" has been registered. Please upload documents for verification.`,
      'SYSTEM'
    );
    return shop;
  }

  async findAll(lat?: number, lng?: number, includeUnverified = false, partnerType?: string, hasServices?: boolean) {
    const cacheKey = `shops_all_${lat?.toFixed(2) || 'none'}_${lng?.toFixed(2) || 'none'}_${includeUnverified}_${partnerType || 'none'}_${hasServices || 'none'}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const whereClause: any = includeUnverified ? {} : { isVerified: true, isActive: true };
    if (partnerType) whereClause.partnerType = partnerType;
    if (hasServices !== undefined) whereClause.hasServices = hasServices;

    const shops = await this.prisma.shop.findMany({ 
      where: whereClause,
      include: { timings: true } 
    });
    
    let result = shops;
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      const filteredShops = shops.map(shop => {
        if (shop.latitude == null || shop.longitude == null) return { ...shop, distanceKm: 999 };
        const R = 6371; // Earth's radius in km
        const dLat = (shop.latitude - lat) * (Math.PI / 180);
        const dLon = (shop.longitude - lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * (Math.PI / 180)) * Math.cos(shop.latitude * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return { ...shop, distanceKm: distance };
      }).filter(shop => shop.distanceKm <= (shop.deliveryRadius || 5.0));
      result = filteredShops.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    
    await this.cacheManager.set(cacheKey, result, 60000);
    return result;
  }

  async findMyShop(ownerId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { ownerId },
      include: { timings: true, documents: true, holidays: true },
    });
    if (!shop) throw new NotFoundException('You do not have a shop registered yet');

    return {
      ...shop,
      status: this.computeShopStatus(shop.timings, shop.holidays),
    };
  }

  /**
   * Get a shop with full open/closed status for today.
   * Customers will see "Open Now", "Closed", "Closes at 9 PM", or "Holiday: Diwali"
   */
  async findOne(id: string) {
    const cacheKey = `shop_detail_${id}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: { timings: true, documents: true, holidays: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const result = {
      ...shop,
      status: this.computeShopStatus(shop.timings, shop.holidays),
    };
    await this.cacheManager.set(cacheKey, result, 30000); // 30s cache for real-time status
    return result;
  }

  /**
   * Computes real-time shop status.
   * Priority: Holiday > Weekly isClosed > Open/Closed based on time
   */
  private computeShopStatus(timings: any[], holidays: any[]) {
    const now = new Date();
    const todayIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const dayOfWeek = todayIST.getDay(); // 0=Sunday...6=Saturday

    // 1. Check if today is a specific holiday
    const todayDateStr = todayIST.toISOString().split('T')[0];
    const holiday = holidays.find(h => {
      const hDate = new Date(h.date).toISOString().split('T')[0];
      return hDate === todayDateStr;
    });
    if (holiday) {
      return {
        isOpen: false,
        label: 'CLOSED',
        reason: holiday.reason ? `Holiday: ${holiday.reason}` : 'Closed Today',
        isHoliday: true,
      };
    }

    // 2. Check weekly timing for today
    const timing = timings.find(t => t.dayOfWeek === dayOfWeek);
    if (!timing || timing.isClosed) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      return {
        isOpen: false,
        label: 'CLOSED',
        reason: `Closed on ${dayName}s`,
        isHoliday: false,
      };
    }

    // 3. Check if currently within open hours
    const [openH, openM] = timing.openTime.split(':').map(Number);
    const [closeH, closeM] = timing.closeTime.split(':').map(Number);
    const currentMinutes = todayIST.getHours() * 60 + todayIST.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    return {
      isOpen,
      label: isOpen ? 'OPEN' : 'CLOSED',
      openTime: timing.openTime,
      closeTime: timing.closeTime,
      reason: isOpen
        ? `Open until ${timing.closeTime}`
        : currentMinutes < openMinutes
          ? `Opens at ${timing.openTime}`
          : `Closed. Opens tomorrow`,
      isHoliday: false,
    };
  }

  async update(id: string, ownerId: string, updateShopDto: UpdateShopDto, isAdmin = false) {
    const shop = await this.findOne(id);
    if (!isAdmin && shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have permission to edit this shop');
    }
    const data: any = { ...updateShopDto };
    if (updateShopDto.partnerType) {
      data.partnerType = updateShopDto.partnerType as any;
    }
    const updated = await this.prisma.shop.update({ where: { id }, data });
    await this.cacheManager.del(`shop_detail_${id}`);
    return updated;
  }

  async verifyShop(id: string, adminId: string, isVerified: boolean) {
    const shop = await this.findOne(id);
    const updated = await this.prisma.shop.update({ where: { id }, data: { isVerified } });
    const statusText = isVerified ? 'verified' : 'unverified';
    await this.notifications.sendInAppNotification(
      shop.ownerId, 'Shop Verification Status',
      `Your shop "${shop.name}" has been ${statusText} by an admin.`,
      'SYSTEM'
    );
    return updated;
  }

  // ==================== PARTNER: TIMING MANAGEMENT ====================

  /**
   * Partner sets or updates a single day's timing.
   * e.g., Set Monday to Open 9AM–9PM, or mark Sunday as Closed.
   */
  async upsertTiming(shopId: string, ownerId: string, timingDto: CreateShopTimingDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('Not your shop');

    const existing = await this.prisma.shopTiming.findUnique({
      where: { shopId_dayOfWeek: { shopId, dayOfWeek: timingDto.dayOfWeek } },
    });

    if (existing) {
      const updated = await this.prisma.shopTiming.update({
        where: { id: existing.id },
        data: timingDto,
      });
      await this.cacheManager.del(`shop_detail_${shopId}`);
      return updated;
    }

    const created = await this.prisma.shopTiming.create({ data: { ...timingDto, shopId } });
    await this.cacheManager.del(`shop_detail_${shopId}`);
    return created;
  }

  /**
   * Partner sets all 7 days at once in a single API call.
   * The app UI shows a weekly schedule grid for the partner.
   */
  async bulkUpsertTimings(shopId: string, ownerId: string, dto: BulkUpdateTimingsDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('Not your shop');

    const days = dto.timings.map(t => t.dayOfWeek);
    const uniqueDays = new Set(days);
    if (uniqueDays.size !== days.length) {
      throw new BadRequestException('Duplicate days found in timing array');
    }

    // Upsert all days atomically
    const results = await this.prisma.$transaction(
      dto.timings.map(timing =>
        this.prisma.shopTiming.upsert({
          where: { shopId_dayOfWeek: { shopId, dayOfWeek: timing.dayOfWeek } },
          create: { shopId, ...timing },
          update: timing,
        })
      )
    );

    this.logger.log(`Shop ${shopId} bulk updated ${dto.timings.length} day timings`);
    await this.cacheManager.del(`shop_detail_${shopId}`);
    return results;
  }

  async getTimings(shopId: string) {
    const timings = await this.prisma.shopTiming.findMany({
      where: { shopId },
      orderBy: { dayOfWeek: 'asc' },
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return timings.map(t => ({
      ...t,
      dayName: days[t.dayOfWeek],
      status: t.isClosed ? 'Closed' : `${t.openTime} – ${t.closeTime}`,
    }));
  }

  // ==================== PARTNER: HOLIDAY / CLOSURE MANAGEMENT ====================

  /**
   * Partner marks a specific date as closed (holiday, sick day, etc.)
   * Customers searching on that date will see "Closed: Diwali"
   */
  async addHoliday(shopId: string, ownerId: string, dto: CreateShopHolidayDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('Not your shop');

    const date = new Date(dto.date);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date format');

    // Prevent marking past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) throw new BadRequestException('Cannot mark past dates as holidays');

    const result = await this.prisma.shopHoliday.upsert({
      where: { shopId_date: { shopId, date } },
      create: { shopId, date, reason: dto.reason },
      update: { reason: dto.reason },
    });
    
    await this.cacheManager.del(`shop_detail_${shopId}`);
    return result;
  }

  async getHolidays(shopId: string) {
    return this.prisma.shopHoliday.findMany({
      where: {
        shopId,
        date: { gte: new Date() }, // Only return upcoming holidays
      },
      orderBy: { date: 'asc' },
    });
  }

  async removeHoliday(shopId: string, ownerId: string, holidayId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('Not your shop');

    const holiday = await this.prisma.shopHoliday.findUnique({ where: { id: holidayId } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    if (holiday.shopId !== shopId) throw new ForbiddenException('Not your holiday entry');

    const result = await this.prisma.shopHoliday.delete({ where: { id: holidayId } });
    await this.cacheManager.del(`shop_detail_${shopId}`);
    return result;
  }

  // ==================== DOCUMENT MANAGEMENT ====================

  async addDocument(shopId: string, ownerId: string, docDto: CreateShopDocumentDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.ownerId !== ownerId) throw new ForbiddenException('Not your shop');
    return this.prisma.shopDocument.create({ data: { ...docDto, shopId } });
  }

  async verifyDocument(documentId: string, isVerified: boolean) {
    const doc = await this.prisma.shopDocument.findUnique({
      where: { id: documentId },
      include: { shop: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const updatedDoc = await this.prisma.shopDocument.update({
      where: { id: documentId },
      data: { isVerified },
    });

    await this.notifications.sendInAppNotification(
      doc.shop.ownerId, 'Document Verified',
      `Your document ${doc.documentType} for shop "${doc.shop.name}" has been verified.`,
      'SYSTEM'
    );
    return updatedDoc;
  }

  // ==================== SHARED UTILITY (used by Appointments) ====================

  /**
   * Checks if a shop is open on a specific date.
   * Called by AppointmentsService before allowing a booking.
   */
  async isShopOpenOnDate(shopId: string, date: Date): Promise<{ isOpen: boolean; reason?: string }> {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const checkDateStr = checkDate.toISOString().split('T')[0];

    // 1. Check holidays
    const holiday = await this.prisma.shopHoliday.findFirst({
      where: {
        shopId,
        date: {
          gte: checkDate,
          lt: new Date(checkDate.getTime() + 86400000),
        },
      },
    });
    if (holiday) {
      return { isOpen: false, reason: holiday.reason ? `Holiday: ${holiday.reason}` : 'Shop is closed on this date' };
    }

    // 2. Check weekly timing
    const dayOfWeek = checkDate.getDay();
    const timing = await this.prisma.shopTiming.findUnique({
      where: { shopId_dayOfWeek: { shopId, dayOfWeek } },
    });

    if (!timing || timing.isClosed) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return { isOpen: false, reason: `Shop is closed on ${days[dayOfWeek]}s` };
    }

    return { isOpen: true };
  }
}
