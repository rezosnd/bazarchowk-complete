import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    EmailModule,
    // Root Connection
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    // Register Queues
    BullModule.registerQueue(
      { name: 'email-queue' },
      { name: 'notification-queue' },
      { name: 'analytics-queue' },
      { name: 'cleanup-queue' },
    ),
  ],
  providers: [QueueService, EmailProcessor, CleanupProcessor],
  exports: [QueueService],
})
export class QueueModule {}
