import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { QueueController } from './queue.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    EmailModule,
    NotificationsModule,
    // Redis Queue Disabled
    // Background jobs will be executed synchronously as a fallback
  ],
  controllers: [QueueController],
  providers: [QueueService, EmailProcessor, CleanupProcessor, NotificationProcessor, AnalyticsProcessor],
  exports: [QueueService],
})
export class QueueModule {}
