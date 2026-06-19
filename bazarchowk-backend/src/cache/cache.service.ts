import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class GlobalCacheService {
  private readonly logger = new Logger(GlobalCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Universal Get Method
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Universal Set Method (TTL in milliseconds)
   */
  async set(key: string, value: any, ttlMs?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttlMs);
  }

  /**
   * Universal Delete Method
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Fetch Home Feed Cache
   */
  async getHomeFeed(cityId: string) {
    return this.get(`home:feed:${cityId}`);
  }

  async setHomeFeed(cityId: string, data: any) {
    // Cache home feed for 10 minutes (600000 ms)
    await this.set(`home:feed:${cityId}`, data, 600000);
  }

  /**
   * Invalidate Shop Cache when inventory updates
   */
  async invalidateShop(shopId: string) {
    this.logger.log(`Invalidating Cache for Shop: ${shopId}`);
    await this.del(`shop:${shopId}`);
    await this.del(`shop:${shopId}:inventory`);
  }

  /**
   * Invalidate Product Cache when product is edited
   */
  async invalidateProduct(productId: string) {
    this.logger.log(`Invalidating Cache for Product: ${productId}`);
    await this.del(`product:${productId}`);
  }

  /**
   * Clear all Search Cache (if necessary)
   */
  async clearSearchCache() {
    this.logger.log(`Clearing all Search Caches`);
    // Note: cache-manager does not support bulk delete natively by wildcard.
    // We would need the native Redis client for 'keys *' operations, 
    // but in Production we avoid 'KEYS' and just let short TTLs expire.
  }
}
