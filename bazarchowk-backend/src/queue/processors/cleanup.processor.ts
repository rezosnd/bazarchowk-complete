import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('cleanup-queue')
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Starting scheduled cleanup job: ${job.name} (ID: ${job.id})`);

    try {
      // Example 1: Clean up abandoned carts older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const deletedCarts = await this.prisma.cartItem.deleteMany({
        where: { createdAt: { lt: sevenDaysAgo } }
      });

      this.logger.log(`Cleaned up ${deletedCarts.count} abandoned cart items.`);

      // Example 2: Prune old resolved support tickets (if requirements specify)
      // Example 3: Prune unverified Guest users older than 30 days
      
    } catch (error) {
      this.logger.error(`Cleanup job failed:`, error);
      throw error;
    }

    this.logger.log(`Finished scheduled cleanup job.`);
  }
}
