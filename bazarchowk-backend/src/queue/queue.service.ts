import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Redis Queue Disabled - Running Background Tasks In-Memory to prevent max requests limit errors');
  }

  async enqueueEmail(jobName: string, data: any) {
    this.logger.log(`Executing Email Job In-Memory: ${jobName}`);
    Promise.resolve().then(async () => {
        try {
            switch (jobName) {
                case 'send-welcome': await this.emailService.sendWelcomeEmail(data.to, data.name); break;
                case 'send-refund': await this.emailService.sendRefundEmail(data.to, data.name, data.orderId, data.amount); break;
                case 'send-invoice': await this.emailService.sendInvoiceEmailHtml(data.to, data.name, data.invoiceNumber, Buffer.from(data.pdfBuffer)); break;
                case 'send-ticket-update': await this.emailService.sendTicketUpdateEmail(data.to, data.name, data.ticketId, data.updateMessage); break;
            }
        } catch(e) { this.logger.error('Email task failed', e); }
    });
    return { id: `in-memory-${Date.now()}` };
  }

  async enqueueNotification(jobName: string, data: any) {
    this.logger.log(`Executing Notification Job In-Memory: ${jobName}`);
    Promise.resolve().then(async () => {
        try {
            if(jobName === 'send-push') {
                await this.notificationsService.sendPushNotification(data.userId, data.title, data.body, data.data);
            }
        } catch(e) { this.logger.error('Notification task failed', e); }
    });
    return { id: `in-memory-${Date.now()}` };
  }

  async enqueueAnalytics(jobName: string, data: any) {
    this.logger.log(`Executing Analytics Job In-Memory: ${jobName}`);
    Promise.resolve().then(async () => {
        try {
            if (jobName === 'track-page-view' || jobName === 'track-event') {
                await this.prisma.auditLog.create({
                    data: {
                        actorId: data.userId || null,
                        action: jobName.toUpperCase(),
                        entity: 'Analytics',
                        entityId: data.entityId || 'SYS',
                        newValue: JSON.stringify(data),
                        ipAddress: data.ipAddress || '0.0.0.0',
                    }
                });
            }
        } catch(e) { this.logger.error('Analytics task failed', e); }
    });
    return { id: `in-memory-${Date.now()}` };
  }
}
