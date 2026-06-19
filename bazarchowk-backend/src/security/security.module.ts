import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      // 1. Default Limit (General APIs): 100 requests per 60 seconds
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      // 2. Login/Auth Limit: 5 requests per 60 seconds (Brute Force Protection)
      {
        name: 'login',
        ttl: 60000,
        limit: 5,
      },
      // 3. Search Scraping Limit: 30 searches per 60 seconds (Anti-Scraping)
      {
        name: 'search',
        ttl: 60000,
        limit: 30,
      }
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Automatically protects all endpoints globally
    },
  ],
})
export class SecurityModule {}
