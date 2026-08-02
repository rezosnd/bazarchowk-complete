import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalCacheService } from '../cache/cache.service';

@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: GlobalCacheService
  ) {}

  async getCityHomeFeed(cityId: string) {
    // 1. Try to get from cache
    const cached = await this.cacheService.getHomeFeed(cityId);
    if (cached) {
      this.logger.debug(`Home feed cache hit for city: ${cityId}`);
      return cached;
    }

    // 2. Aggregate data if cache miss
    const [banners, categories, topShops, trendingProducts] = await Promise.all([
      this.prisma.appBanner.findMany({ where: { isActive: true }, orderBy: { position: 'asc' } }),
      this.prisma.category.findMany({ where: { isActive: true }, take: 8 }),
      this.prisma.shop.findMany({ 
        where: { isActive: true, city: cityId, isVerified: true }, 
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.product.findMany({
        where: { isPublished: true, shop: { city: cityId } },
        include: { images: { where: { isPrimary: true }, take: 1 }, shop: { select: { name: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const feed = {
      banners,
      categories,
      featuredShops: topShops,
      trendingProducts
    };

    // 3. Set Cache
    await this.cacheService.setHomeFeed(cityId, feed);

    return feed;
  }
}
