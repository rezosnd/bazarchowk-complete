import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto, SearchType } from './dto/search.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async search(searchQuery: SearchQueryDto, userId?: string) {
    const { query, type = SearchType.ALL, limit = 10, offset = 0, city } = searchQuery;
    
    // Create deterministic cache key
    const cacheKey = `search_${type}_${query.toLowerCase()}_${city || 'ALL'}_${offset}_${limit}_${searchQuery.latitude || 0}_${searchQuery.longitude || 0}`;
    
    // 1. Check Cache First (High Performance)
    const cachedResult = await this.cacheManager.get(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Cache hit for search: ${query}`);
      // Log search history asynchronously even on cache hit
      this.logSearchHistory(userId, query, type, (cachedResult as any).pagination.totalResults);
      return cachedResult;
    }

    // Format query for Postgres to_tsquery and sanitize to prevent syntax errors
    const sanitizedQuery = query.replace(/[&|!():*<>{}\[\]]/g, '').trim();
    if (!sanitizedQuery) {
      return {
        query,
        results: { products: [], shops: [], services: [] },
        pagination: { limit, offset, totalResults: 0 }
      };
    }
    const formattedQuery = sanitizedQuery.split(/\s+/).join(' | ');

    let products: any[] = [];
    let shops: any[] = [];
    let services: any[] = [];

    // Base conditions for shops
    const shopConditions: any = { isActive: true };
    if (city) {
      shopConditions.city = { equals: city, mode: 'insensitive' };
    }

    // 2. Perform FTS Queries concurrently
    const queries = [];

    if (type === SearchType.ALL || type === SearchType.PRODUCTS) {
      queries.push(
        this.prisma.product.findMany({
          where: {
            isPublished: true,
            shop: shopConditions,
            OR: [
              { name: { search: formattedQuery } },
              { description: { search: formattedQuery } },
              { searchTerms: { search: formattedQuery } },
              { name: { contains: query, mode: 'insensitive' } },
              { name: { contains: query.length > 3 ? query.substring(0, 4) : query, mode: 'insensitive' } },
            ],
          },
          include: {
            shop: { select: { id: true, name: true, city: true, deliveryRadius: true, latitude: true, longitude: true } },
            images: { where: { isPrimary: true }, take: 1 },
            variants: true,
          },
          take: Number(limit),
          skip: Number(offset),
        }).then(res => products = res)
      );
    }

    if (type === SearchType.ALL || type === SearchType.SHOPS) {
      queries.push(
        this.prisma.shop.findMany({
          where: {
            ...shopConditions,
            OR: [
              { name: { search: formattedQuery } },
              { description: { search: formattedQuery } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: Number(limit),
          skip: Number(offset),
        }).then(res => shops = res)
      );
    }

    if (type === SearchType.ALL || type === SearchType.SERVICES) {
      queries.push(
        this.prisma.serviceOffering.findMany({
          where: {
            isActive: true,
            shop: shopConditions,
            OR: [
              { name: { search: formattedQuery } },
              { description: { search: formattedQuery } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
          include: {
            shop: { select: { id: true, name: true, city: true, deliveryRadius: true, latitude: true, longitude: true } },
          },
          take: Number(limit),
          skip: Number(offset),
        }).then(res => services = res)
      );
    }

    await Promise.all(queries);

    // 3. Geofencing (Software Haversine fallback)
    if (searchQuery.latitude && searchQuery.longitude) {
      const { latitude, longitude, radius = 20 } = searchQuery;
      
      const isWithinRadius = (lat1: number, lon1: number, lat2: number, lon2: number, rad: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c <= rad;
      };

      if (shops.length > 0) {
        shops = shops.filter(shop => 
          isWithinRadius(latitude, longitude, shop.latitude, shop.longitude, Math.max(radius, shop.deliveryRadius || 20))
        );
      }
      if (products.length > 0) {
        products = products.filter(product => 
          isWithinRadius(latitude, longitude, product.shop.latitude, product.shop.longitude, Math.max(radius, product.shop.deliveryRadius || 20))
        );
      }
      if (services.length > 0) {
        services = services.filter(service => 
          isWithinRadius(latitude, longitude, service.shop.latitude, service.shop.longitude, Math.max(radius, service.shop.deliveryRadius || 20))
        );
      }
    }

    const totalResults = products.length + shops.length + services.length;

    const finalResult = {
      query,
      results: { products, shops, services },
      pagination: { limit, offset, totalResults }
    };

    // 4. Cache the payload (TTL: 60 seconds to balance freshness and speed)
    await this.cacheManager.set(cacheKey, finalResult, 60000);

    // 5. Asynchronously log to SearchHistory
    this.logSearchHistory(userId, query, type, totalResults);

    return finalResult;
  }

  /**
   * Fire-and-forget search history logging for AI recommendations later
   */
  private logSearchHistory(userId: string | undefined, query: string, type: string, resultsCount: number) {
    this.prisma.searchHistory.create({
      data: {
        userId: userId || null,
        query: query.substring(0, 200), // Max length safety
        filters: JSON.stringify({ type }),
        results: resultsCount
      }
    }).catch(err => this.logger.error('Failed to log search history', err));
  }
}
