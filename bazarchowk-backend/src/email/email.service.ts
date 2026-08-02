import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

interface SettlementDetails {
  shopName: string;
  periodStart: Date;
  periodEnd: Date;
  settlementId: string;
  paymentRef: string;
  paymentMode: string;
  totalOrders: number;
  grossSales: number;
  commission: number;
  netPayout: number;
}

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

  // --- ORDER AUTOMATION --- //
  private generateOrderPDF(orderNumber: string, customerName: string, items: any[], totalAmt: number): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fillColor('#FF8A00').fontSize(16).text('Customer Order Invoice', { align: 'center' });
      doc.moveDown(2);

      const logoPath = 'D:\\bazarchowk-complete\\bazarchowk-customer\\assets\\images\\logo.png';
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (595.28 / 2) - 90, doc.y, { width: 180 });
        doc.moveDown(6);
      } else {
        doc.fillColor('#FF8A00').fontSize(24).text('BAZARCHOWK', { align: 'center', characterSpacing: 2 });
        doc.moveDown(2);
      }

      doc.fillColor('#111827').fontSize(14).text('BILLED TO:', { underline: true });
      doc.fontSize(12).text(customerName);
      doc.moveDown(2);

      doc.fontSize(14).text('ORDER DETAILS:', { underline: true });
      doc.fontSize(12);

      const startY = doc.y;
      doc.text('Order ID:', 50, startY);
      doc.text(orderNumber, 200, startY);
      doc.text('Date:', 50, startY + 20);
      doc.text(new Date().toLocaleDateString(), 200, startY + 20);

      doc.moveDown(5);

      doc.rect(50, doc.y, 495, 25).fill('#fff3e0').stroke('#FF8A00');
      doc.fillColor('#FF8A00').font('Helvetica-Bold');
      doc.text('Item', 60, doc.y - 18);
      doc.text('Qty', 300, doc.y - 18, { width: 50, align: 'center' });
      doc.text('Price (INR)', 400, doc.y - 18, { width: 135, align: 'right' });
      doc.moveDown(1);

      doc.font('Helvetica').fillColor('#111827');
      items.forEach(item => {
        doc.text(item.name, 60, doc.y);
        doc.text(item.qty.toString(), 300, doc.y, { width: 50, align: 'center' });
        doc.text(item.price.toFixed(2), 400, doc.y, { width: 135, align: 'right' });
        doc.moveDown(0.5);
      });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fillColor('#FF8A00').fontSize(16);
      doc.text('TOTAL AMOUNT', 60, doc.y);
      doc.text(totalAmt.toFixed(2), 400, doc.y, { width: 135, align: 'right' });

      doc.moveDown(4);
      doc.font('Helvetica').fillColor('#9ca3af').fontSize(10).text('Thank you for shopping with BazarChowk!', { align: 'center' });

      doc.end();
    });
  }

  async sendOrderInvoice(to: string, name: string, invoiceNumber: string, items: any[], totalAmt: number) {
    const pdfBuffer = await this.generateOrderPDF(invoiceNumber, name, items, totalAmt);
    return this.sendInvoiceEmailHtml(to, name, invoiceNumber, pdfBuffer);
  }

  // --- SETTLEMENT AUTOMATION --- //

  private generateSettlementPDF(details: SettlementDetails): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fillColor('#FF8A00').fontSize(16).text('Partner Settlement Invoice', { align: 'center' });
      doc.moveDown(2);

      const logoPath = 'D:\\bazarchowk-complete\\bazarchowk-customer\\assets\\images\\logo.png';
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (595.28 / 2) - 90, doc.y, { width: 180 });
        doc.moveDown(6); // Adjusted spacing since logo is drawn absolutely to Y but moves cursor down less naturally
      } else {
        doc.fillColor('#FF8A00').fontSize(24).text('BAZARCHOWK', { align: 'center', characterSpacing: 2 });
        doc.moveDown(2);
      }

      doc.fillColor('#111827').fontSize(14).text('INVOICE TO:', { underline: true });
      doc.fontSize(12).text(details.shopName);
      doc.moveDown(2);

      doc.fontSize(14).text('SETTLEMENT DETAILS:', { underline: true });
      doc.fontSize(12);

      const startY = doc.y;
      doc.text('Period:', 50, startY);
      doc.text(`${details.periodStart.toLocaleDateString()} - ${details.periodEnd.toLocaleDateString()}`, 200, startY);

      doc.text('Settlement ID:', 50, startY + 20);
      doc.text(details.settlementId, 200, startY + 20);

      doc.text('Transaction Ref:', 50, startY + 40);
      doc.text(details.paymentRef, 200, startY + 40);

      doc.text('Payment Method:', 50, startY + 60);
      doc.text(details.paymentMode, 200, startY + 60);

      doc.moveDown(5);

      doc.rect(50, doc.y, 495, 25).fill('#fff3e0').stroke('#FF8A00');
      doc.fillColor('#FF8A00').font('Helvetica-Bold');
      doc.text('Description', 60, doc.y - 18);
      doc.text('Amount (INR)', 400, doc.y - 18, { width: 135, align: 'right' });
      doc.moveDown(1);

      doc.font('Helvetica').fillColor('#111827');
      doc.text(`Gross Sales (${details.totalOrders} Orders)`, 60, doc.y);
      doc.text(details.grossSales.toFixed(2), 400, doc.y, { width: 135, align: 'right' });
      doc.moveDown(1);

      doc.fillColor('#dc2626');
      doc.text('Platform Commission', 60, doc.y);
      doc.text(`-${details.commission.toFixed(2)}`, 400, doc.y, { width: 135, align: 'right' });
      doc.moveDown(1);

      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e5e7eb');
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fillColor('#FF8A00').fontSize(16);
      doc.text('NET PAYOUT', 60, doc.y);
      doc.text(details.netPayout.toFixed(2), 400, doc.y, { width: 135, align: 'right' });

      doc.moveDown(4);
      doc.font('Helvetica').fillColor('#9ca3af').fontSize(10).text('This is a computer-generated invoice and does not require a physical signature.', { align: 'center' });

      doc.end();
    });
  }

  async sendSettlementEmail(to: string, details: SettlementDetails) {
    const pdfBuffer = await this.generateSettlementPDF(details);

    return this.sendTransactionalEmail({
      to,
      subject: `Weekly Settlement Paid - BazarChowk`,
      type: 'SETTLEMENT',
      title: 'Weekly Settlement Paid',
      customerName: details.shopName,
      message: `Your weekly settlement of <strong>₹${details.netPayout.toFixed(2)}</strong> has been successfully processed and transferred to your registered bank account via ${details.paymentMode}. A formal PDF invoice of this transaction has been attached to this email for your tax and accounting records.`,
      buttonText: 'View Partner Dashboard',
      buttonUrl: 'https://bazarchowk.com/partner-dashboard',
      attachments: [{ filename: `Settlement_${details.settlementId}.pdf`, content: pdfBuffer }]
    });
  }
}
