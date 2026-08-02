import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../email/email.service';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing email job: ${job.name} (ID: ${job.id})`);

    const { to, name, type, data } = job.data;

    try {
      switch (job.name) {
        case 'send-welcome':
          await this.emailService.sendWelcomeEmail(to, name);
          break;
        case 'send-refund':
          await this.emailService.sendRefundEmail(to, name, data.orderId, data.amount);
          break;
        case 'send-invoice':
          // Convert buffer back from JSON serialization if needed
          const buffer = Buffer.from(data.pdfBuffer);
          await this.emailService.sendInvoiceEmailHtml(to, name, data.invoiceNumber, buffer);
          break;
        case 'send-ticket-update':
          await this.emailService.sendTicketUpdateEmail(to, name, data.ticketId, data.updateMessage);
          break;
        default:
          this.logger.warn(`Unknown email job type: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed processing email job ${job.id}:`, error);
      throw error; // Let BullMQ retry it
    }

    this.logger.log(`Successfully processed email job: ${job.name} (ID: ${job.id})`);
  }
}
