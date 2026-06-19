import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
    @InjectQueue('notification-queue') private readonly notificationQueue: Queue,
    @InjectQueue('analytics-queue') private readonly analyticsQueue: Queue,
    @InjectQueue('cleanup-queue') private readonly cleanupQueue: Queue,
  ) {}

  async onModuleInit() {
    // Schedule repeating cleanup job every night at 3:00 AM
    await this.cleanupQueue.add('daily-cleanup', {}, {
      repeat: { pattern: '0 3 * * *' },
      jobId: 'daily-cleanup-job'
    });
    this.logger.log('Scheduled nightly cleanup job');
  }

  async enqueueEmail(jobName: string, data: any) {
    this.logger.log(`Enqueuing Email Job: ${jobName}`);
    return this.emailQueue.add(jobName, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async enqueueNotification(jobName: string, data: any) {
    this.logger.log(`Enqueuing Notification Job: ${jobName}`);
    return this.notificationQueue.add(jobName, data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async enqueueAnalytics(jobName: string, data: any) {
    this.logger.log(`Enqueuing Analytics Job: ${jobName}`);
    return this.analyticsQueue.add(jobName, data, {
      attempts: 2,
      removeOnComplete: true, // Don't bloat Redis with completed analytics jobs
    });
  }
}
