import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { AbuseDetectionGuard } from './abuse.guard';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        }
      ],
      storage: process.env.REDIS_URL ? new ThrottlerStorageRedisService(process.env.REDIS_URL) : undefined
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Automatically protects all endpoints globally
    },
    {
      provide: APP_GUARD,
      useClass: AbuseDetectionGuard, // Global abuse detection
    },
  ],
})
export class SecurityModule {}
