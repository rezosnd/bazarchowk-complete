import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('analytics-queue')
export class AnalyticsProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing analytics job: ${job.name} (ID: ${job.id})`);

    try {
      switch (job.name) {
        case 'track-page-view':
        case 'track-event':
          // Insert raw events into an analytics or audit log table
          // Since we don't have an explicit AnalyticsEvent table in Prisma, we use audit_logs as a fallback
          await this.prisma.auditLog.create({
            data: {
              actorId: job.data.userId || null,
              action: job.name.toUpperCase(),
              entity: 'Analytics',
              entityId: job.data.entityId || 'SYS',
              newValue: JSON.stringify(job.data),
              ipAddress: job.data.ipAddress || '0.0.0.0',
            }
          });
          break;
        case 'aggregate-daily':
          this.logger.log('Running daily analytics aggregation');
          break;
        default:
          this.logger.warn(`Unknown analytics job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed processing analytics job ${job.id}:`, error);
      throw error;
    }

    this.logger.log(`Successfully processed analytics job: ${job.name} (ID: ${job.id})`);
  }
}
