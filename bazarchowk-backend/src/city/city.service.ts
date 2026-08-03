import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalCacheService } from '../cache/cache.service';
import { CreateCityDto, UpdateCityDto, CreateRegionalPromotionDto } from './dto/city.dto';

@Injectable()
export class CityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: GlobalCacheService,
  ) {}

  /**
   * PUBLIC: Get all active, launched cities (for City Selection screen in App)
   */
  async getActiveCities() {
    const cacheKey = 'cities:active';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const cities = await this.prisma.cityConfig.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, state: true, slug: true,
        isLaunched: true, defaultDeliveryFee: true,
        minOrderAmount: true, latitude: true, longitude: true,
        radiusKm: true, languages: true,
      },
    });

    await this.cache.set(cacheKey, cities, 300000); // Cache 5 minutes
    return cities;
  }

  /**
   * PUBLIC: Get city config by slug (used by frontend to load city-specific settings)
   */
  async getCityBySlug(slug: string) {
    const cacheKey = `city:${slug}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const city = await this.prisma.cityConfig.findUnique({
      where: { slug },
      include: {
        promotions: {
          where: { isActive: true, OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        },
      },
    });

    if (!city) throw new NotFoundException(`City '${slug}' not found or not operational`);

    await this.cache.set(cacheKey, city, 300000);
    return city;
  }

  /**
   * ADMIN: Create new city
   */
  async createCity(dto: CreateCityDto) {
    const city = await this.prisma.cityConfig.create({ data: dto as any });
    await this.cache.del('cities:active');
    return city;
  }

  /**
   * ADMIN: Update city config (pricing, status, launch)
   */
  async updateCity(id: string, dto: UpdateCityDto) {
    const city = await this.prisma.cityConfig.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City config not found');

    const updated = await this.prisma.cityConfig.update({ where: { id }, data: dto as any });

    // Invalidate caches
    await this.cache.del('cities:active');
    await this.cache.del(`city:${city.slug}`);
    return updated;
  }

  /**
   * ADMIN: Get all cities (including inactive, for admin dashboard)
   */
  async getAllCitiesAdmin() {
    return this.prisma.cityConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { promotions: true } } },
    });
  }

  /**
   * ADMIN: Add a regional promotion to a city
   */
  async addPromotion(cityId: string, dto: CreateRegionalPromotionDto) {
    const city = await this.prisma.cityConfig.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');

    const promo = await this.prisma.regionalPromotion.create({
      data: { ...dto, cityConfigId: cityId },
    });

    // Invalidate city cache
    await this.cache.del(`city:${city.slug}`);
    return promo;
  }

  /**
   * PUBLIC: Validate & apply a city-specific coupon code
   */
  async validateCoupon(couponCode: string, citySlug: string, orderAmount: number) {
    const promo = await this.prisma.regionalPromotion.findUnique({
      where: { couponCode },
      include: { city: true },
    });

    if (!promo || !promo.isActive) return { valid: false, reason: 'Invalid or expired coupon' };
    if (promo.city.slug !== citySlug) return { valid: false, reason: 'Coupon not valid in this city' };
    if (promo.endDate && promo.endDate < new Date()) return { valid: false, reason: 'Coupon has expired' };
    if (promo.maxUses && promo.usedCount >= promo.maxUses) return { valid: false, reason: 'Coupon usage limit reached' };
    if (promo.minOrderAmt && orderAmount < promo.minOrderAmt) {
      return { valid: false, reason: `Minimum order amount ₹${promo.minOrderAmt} required` };
    }

    const discount = promo.discountType === 'PERCENT'
      ? (orderAmount * promo.discountValue) / 100
      : promo.discountValue;

    return {
      valid: true,
      promoId: promo.id,
      discountAmount: Math.min(discount, orderAmount),
      discountType: promo.discountType,
    };
  }
}
