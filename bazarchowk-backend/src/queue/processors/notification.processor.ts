import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing notification job: ${job.name} (ID: ${job.id})`);

    const { userId, title, message, type, metadata } = job.data;

    try {
      switch (job.name) {
        case 'send-push':
          await this.notificationsService.sendInAppNotification(userId, title, message, type || 'SYSTEM');
          // In a real app, you would also trigger FCM here via NotificationsService
          break;
        case 'broadcast':
          // Example: send to multiple users
          this.logger.log(`Broadcasting: ${title} to all`);
          break;
        default:
          this.logger.warn(`Unknown notification job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed processing notification job ${job.id}:`, error);
      throw error;
    }

    this.logger.log(`Successfully processed notification job: ${job.name} (ID: ${job.id})`);
  }
}
