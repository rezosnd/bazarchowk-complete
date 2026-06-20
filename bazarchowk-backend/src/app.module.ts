import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AddressesModule } from './addresses/addresses.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CategoriesModule } from './categories/categories.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { SearchModule } from './search/search.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DeliveryModule } from './delivery/delivery.module';
import { WalletModule } from './wallet/wallet.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { AdsModule } from './ads/ads.module';
import { BusinessModule } from './business/business.module';
import { VoiceOrderingModule } from './voice-ordering/voice-ordering.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './health/health.module';
import { RolesModule } from './roles/roles.module';
import { SupportModule } from './support/support.module';
import { CouponsModule } from './coupons/coupons.module';
import { BillingModule } from './billing/billing.module';
import { MarketsModule } from './markets/markets.module';
import { SettingsModule } from './settings/settings.module';
import { AuditModule } from './audit/audit.module';
import { ActivityModule } from './activity/activity.module';
import { EmailModule } from './email/email.module';
import { EventsModule } from './events/events.module';
import { QueueModule } from './queue/queue.module';
import { GlobalCacheModule } from './cache/cache.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SecurityModule } from './security/security.module';
import { FraudModule } from './fraud/fraud.module';
import { BackupModule } from './backup/backup.module';
import { CityModule } from './city/city.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SettlementModule } from './settlement/settlement.module';
import { FranchiseModule } from './franchise/franchise.module';
import { CommissionModule } from './commission/commission.module';
import { FinanceModule } from './finance/finance.module';
import { CashVerificationModule } from './cash-verification/cash-verification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CommunicationModule } from './communication/communication.module';
import { GeminiModule } from './gemini/gemini.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    CacheModule.register({ isGlobal: true, ttl: 300000 }),
    BullModule.forRoot({ connection: new (require('ioredis').Redis)(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null }) }),
    HealthModule,
    RolesModule,
    SupportModule,
    CouponsModule,
    BillingModule,
    MarketsModule,
    SettingsModule,
    AuditModule,
    ActivityModule,
    EmailModule,
    EventsModule,
    QueueModule,
    GlobalCacheModule,
    MonitoringModule,
    SecurityModule,
    FraudModule,
    BackupModule,
    CityModule,
    SuperAdminModule,
    SettlementModule,
    FranchiseModule,
    CommissionModule,
    FinanceModule,
    CashVerificationModule,
    CommunicationModule,
    GeminiModule,
    CloudinaryModule,
    AuthModule, UsersModule, PrismaModule, AddressesModule, NotificationsModule, CategoriesModule, ShopsModule, ProductsModule, InventoryModule, SearchModule, CartModule, OrdersModule, PaymentsModule, ReviewsModule, RealtimeModule, AppointmentsModule, DeliveryModule, WalletModule, LoyaltyModule, AdsModule, BusinessModule, VoiceOrderingModule, AiAssistantModule, AnalyticsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
