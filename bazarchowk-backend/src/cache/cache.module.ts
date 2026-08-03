import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { GlobalCacheService } from './cache.service';


@Global()
@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
    }),
  ],
  providers: [GlobalCacheService],
  exports: [GlobalCacheService],
})
export class GlobalCacheModule {}
