import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { GlobalCacheService } from './cache.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
          ttl: 60 * 1000, // Default TTL 60 seconds
        }),
      }),
    }),
  ],
  providers: [GlobalCacheService],
  exports: [GlobalCacheService],
})
export class GlobalCacheModule {}
