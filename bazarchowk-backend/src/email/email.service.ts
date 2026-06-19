import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

interface EmailPayload {
  to: string;
  subject: string;
  type: string; // e.g. 'WELCOME', 'INVOICE', 'REFUND'
  title: string;
  customerName: string;
  message: string;
  buttonText: string;
  buttonUrl: string;
  attachments?: any[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private htmlTemplate: string;

  constructor(private readonly prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Load the HTML template into memory
    const templatePath = path.join(__dirname, 'templates', 'base-template.html');
    if (fs.existsSync(templatePath)) {
      this.htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    } else {
      this.logger.warn('Email template not found! Using fallback text.');
      this.htmlTemplate = '{{MESSAGE}}';
    }
  }

  private injectTemplate(payload: EmailPayload): string {
    return this.htmlTemplate
      .replace(/{{TITLE}}/g, payload.title)
      .replace(/{{CUSTOMER_NAME}}/g, payload.customerName)
      .replace(/{{MESSAGE}}/g, payload.message)
      .replace(/{{BUTTON_TEXT}}/g, payload.buttonText)
      .replace(/{{BUTTON_URL}}/g, payload.buttonUrl);
  }

  async sendTransactionalEmail(payload: EmailPayload) {
    const htmlBody = this.injectTemplate(payload);

    try {
      await this.transporter.sendMail({
        from: `"BazarChowk" <${process.env.SMTP_USER}>`,
        to: payload.to,
        subject: payload.subject,
        html: htmlBody,
        attachments: payload.attachments,
      });

      // Log success in DB
      await this.prisma.emailLog.create({
        data: {
          toEmail: payload.to,
          subject: payload.subject,
          type: payload.type,
          status: 'SENT'
        }
      });

      this.logger.log(`Email sent successfully to ${payload.to} (${payload.type})`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${payload.to}: ${error.message}`);
      
      // Log failure in DB
      await this.prisma.emailLog.create({
        data: {
          toEmail: payload.to,
          subject: payload.subject,
          type: payload.type,
          status: 'FAILED',
          error: error.message
        }
      });

      return false;
    }
  }

  // --- PRE-CONFIGURED TRANSACTIONS --- //

  async sendWelcomeEmail(to: string, name: string) {
    return this.sendTransactionalEmail({
      to,
      subject: 'Welcome to BazarChowk!',
      type: 'WELCOME',
      title: 'Welcome Aboard!',
      customerName: name,
      message: 'Thank you for joining BazarChowk. You now have access to grocery, food, medicines, and services directly from your local market.',
      buttonText: 'Start Shopping',
      buttonUrl: 'https://bazarchowk.com',
    });
  }

  async sendRefundEmail(to: string, name: string, orderId: string, amount: string) {
    return this.sendTransactionalEmail({
      to,
      subject: `Refund Processed for Order ${orderId}`,
      type: 'REFUND',
      title: 'Refund Processed',
      customerName: name,
      message: `We have successfully processed a refund of Rs. ${amount} for your order ${orderId}. It should reflect in your account within 3-5 business days.`,
      buttonText: 'View Wallet',
      buttonUrl: `https://bazarchowk.com/wallet`,
    });
  }

  async sendTicketUpdateEmail(to: string, name: string, ticketId: string, updateMessage: string) {
    return this.sendTransactionalEmail({
      to,
      subject: `Update on Support Ticket #${ticketId}`,
      type: 'TICKET_UPDATE',
      title: 'Ticket Updated',
      customerName: name,
      message: updateMessage,
      buttonText: 'View Ticket',
      buttonUrl: `https://bazarchowk.com/support/${ticketId}`,
    });
  }

  // Invoice email requires PDF attachments so it takes slightly different args
  async sendInvoiceEmailHtml(to: string, name: string, invoiceNumber: string, pdfBuffer: Buffer) {
    return this.sendTransactionalEmail({
      to,
      subject: `Your BazarChowk Invoice: ${invoiceNumber}`,
      type: 'INVOICE',
      title: 'Tax Invoice Generated',
      customerName: name,
      message: `Please find attached your official tax invoice ${invoiceNumber} from BazarChowk.`,
      buttonText: 'View Order History',
      buttonUrl: 'https://bazarchowk.com/orders',
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer }]
    });
  }
}
