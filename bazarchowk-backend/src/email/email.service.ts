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

  async sendInvoiceEmailHtml(to: string, name: string, invoiceNumber: string, pdfBuffer: Buffer) {
    return this.sendTransactionalEmail({
      to,
      subject: `Your BazarChowk Invoice: ${invoiceNumber}`,
      type: 'INVOICE',
      title: 'Invoice Generated',
      customerName: name,
      message: `Please find attached your invoice ${invoiceNumber}.`,
      buttonText: 'View Orders',
      buttonUrl: `https://bazarchowk.com/orders`,
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer }]
    });
  }

  private generateOrderPDF(
    name: string,
    orderNumber: string,
    items: { name: string; qty: number; price: number }[],
    totalAmt: number,
    options: any
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: any[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fillColor('#FF8A00').fontSize(24).text('BazarChowk', { align: 'center', characterSpacing: 2 });
      doc.moveDown(0.5);
      doc.fillColor('#0F172A').fontSize(12).text('Your Local Market, Delivered.', { align: 'center' });
      doc.moveDown(2);

      const logoPath = path.join(__dirname, 'templates', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 40, { width: 100 });
      }

      doc.fontSize(16).fillColor('#0F172A').text('Order Receipt', { align: 'center', underline: true });
      doc.moveDown(2);

      doc.fontSize(12).text(`Order Number: #${orderNumber}`);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
      doc.text(`Customer: ${name}`);
      doc.text(`Shop: ${options?.shopName || 'BazarChowk Partner'}`);
      doc.text(`Fulfillment: ${options?.deliveryType === 'SELF_PICKUP' ? 'Self Pickup' : 'Home Delivery'}`);
      doc.text(`Payment Method: ${options?.paymentMethod === 'RAZORPAY' ? 'Paid Online' : options?.paymentMethod || 'COD'}`);
      doc.moveDown(2);

      // Table Header
      doc.rect(50, doc.y, 495, 25).fill('#F1F5F9');
      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(12);
      doc.text('Item', 60, doc.y - 18);
      doc.text('Qty', 350, doc.y - 18, { width: 50, align: 'center' });
      doc.text('Amount', 450, doc.y - 18, { width: 85, align: 'right' });
      doc.moveDown(1);

      // Items
      doc.font('Helvetica').fillColor('#0F172A');
      for (const item of items) {
        const startY = doc.y;
        doc.text(item.name, 60, startY, { width: 280 });
        doc.text(`x${item.qty}`, 350, startY, { width: 50, align: 'center' });
        doc.text(`Rs. ${item.price.toFixed(2)}`, 450, startY, { width: 85, align: 'right' });
        doc.moveDown(0.5);
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E2E8F0');
      doc.moveDown(1);

      // Totals
      const subtotal = options?.subtotal ?? items.reduce((s, i) => s + i.price, 0);
      const taxAmount = options?.taxAmount ?? 0;
      const deliveryFee = options?.deliveryFee ?? 0;
      const walletUsed = options?.walletAmountUsed ?? 0;

      doc.text('Item Subtotal:', 300, doc.y);
      doc.text(`Rs. ${subtotal.toFixed(2)}`, 450, doc.y, { width: 85, align: 'right' });
      doc.moveDown(0.5);

      doc.text('Taxes & GST:', 300, doc.y);
      doc.text(`Rs. ${taxAmount.toFixed(2)}`, 450, doc.y, { width: 85, align: 'right' });
      doc.moveDown(0.5);

      doc.text('Delivery Fee:', 300, doc.y);
      doc.text(deliveryFee === 0 ? 'FREE' : `Rs. ${deliveryFee.toFixed(2)}`, 450, doc.y, { width: 85, align: 'right' });
      doc.moveDown(0.5);

      if (walletUsed > 0) {
        doc.fillColor('#FF8A00').text('Wallet Applied:', 300, doc.y);
        doc.text(`-Rs. ${walletUsed.toFixed(2)}`, 450, doc.y, { width: 85, align: 'right' });
        doc.moveDown(0.5);
      }

      doc.moveDown(1);
      doc.rect(290, doc.y, 255, 30).fill('#FF8A00');
      doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(14);
      doc.text('Total Paid:', 300, doc.y - 20);
      doc.text(`Rs. ${totalAmt.toFixed(2)}`, 400, doc.y - 20, { width: 135, align: 'right' });

      doc.moveDown(4);
      doc.font('Helvetica').fillColor('#94A3B8').fontSize(10);
      doc.text('Thank you for shopping with BazarChowk!', { align: 'center' });
      doc.text('This is a computer-generated receipt.', { align: 'center' });

      doc.end();
    });
  }

  // Complete Order Invoice — sends beautiful HTML email AND attached PDF receipt
  async sendOrderInvoice(
    to: string,
    name: string,
    orderNumber: string,
    items: { name: string; qty: number; price: number }[],
    totalAmt: number,
    options?: {
      shopName?: string;
      subtotal?: number;
      taxAmount?: number;
      deliveryFee?: number;
      walletAmountUsed?: number;
      paymentMethod?: string;
      deliveryType?: string;
    }
  ) {
    const shopName = options?.shopName || 'BazarChowk Partner';
    const subtotal = options?.subtotal ?? items.reduce((s, i) => s + i.price, 0);
    const taxAmount = options?.taxAmount ?? 0;
    const deliveryFee = options?.deliveryFee ?? 0;
    const walletUsed = options?.walletAmountUsed ?? 0;
    const payMethod = options?.paymentMethod || 'COD';
    const isSelfPickup = options?.deliveryType === 'SELF_PICKUP';
    const payLabel = payMethod === 'RAZORPAY' ? 'Paid Online (UPI/Card)' : isSelfPickup ? 'Pay at Shop (Cash)' : 'Cash on Delivery';

    const itemRows = items.map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;color:#0F172A;font-size:14px;">${item.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;text-align:center;color:#64748B;font-size:14px;">×${item.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;text-align:right;color:#0F172A;font-weight:700;font-size:14px;">₹${item.price.toFixed(2)}</td>
      </tr>`).join('');

    const walletRow = walletUsed > 0 ? `
      <tr>
        <td colspan="2" style="padding:6px 12px;color:#00B140;font-size:13px;">Wallet Applied</td>
        <td style="padding:6px 12px;text-align:right;color:#00B140;font-weight:700;font-size:13px;">-₹${walletUsed.toFixed(2)}</td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#FFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:#FF8A00;padding:32px 32px 24px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:12px 24px;margin-bottom:16px;">
        <span style="color:#FFF;font-size:26px;font-weight:900;letter-spacing:1px;">🛒 BazarChowk</span>
      </div>
      <h1 style="color:#FFF;margin:0;font-size:22px;font-weight:800;">Order Confirmed!</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Your receipt for Order <strong>#${orderNumber}</strong></p>
    </div>

    <!-- Customer Greeting -->
    <div style="padding:24px 32px 16px;">
      <p style="margin:0;color:#0F172A;font-size:16px;">Hi <strong>${name}</strong>,</p>
      <p style="margin:8px 0 0;color:#64748B;font-size:14px;line-height:20px;">
        Thank you for your order from <strong>${shopName}</strong>. Here is your detailed receipt.
      </p>
    </div>

    <!-- Order Info Bar -->
    <div style="margin:0 32px;background:#F8FAFC;border-radius:12px;padding:14px 20px;border:1px solid #E2E8F0;display:flex;">
      <div style="flex:1;">
        <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;font-weight:600;">Order Number</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#FF8A00;">#${orderNumber}</p>
      </div>
      <div style="flex:1;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;font-weight:600;">Date</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0F172A;">${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
      </div>
      <div style="flex:1;text-align:right;">
        <p style="margin:0;font-size:11px;color:#94A3B8;text-transform:uppercase;font-weight:600;">Fulfillment</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:${isSelfPickup?'#FF8A00':'#0F172A'};">${isSelfPickup ? '🏪 Pickup' : '🛵 Delivery'}</p>
      </div>
    </div>

    <!-- Items Table -->
    <div style="padding:24px 32px 16px;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#0F172A;">Order Items</h2>
      <table style="width:100%;border-collapse:collapse;background:#F8FAFC;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#F1F5F9;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748B;font-weight:700;text-transform:uppercase;">Item</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748B;font-weight:700;text-transform:uppercase;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748B;font-weight:700;text-transform:uppercase;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Bill Breakdown -->
    <div style="margin:0 32px;background:#F8FAFC;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td colspan="2" style="padding:10px 16px;color:#64748B;font-size:13px;">Item Subtotal</td>
          <td style="padding:10px 16px;text-align:right;color:#0F172A;font-size:13px;font-weight:600;">₹${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:10px 16px;color:#64748B;font-size:13px;">Taxes & GST</td>
          <td style="padding:10px 16px;text-align:right;color:#0F172A;font-size:13px;font-weight:600;">₹${taxAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:10px 16px;color:#64748B;font-size:13px;">Delivery Fee</td>
          <td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:600;color:${isSelfPickup||deliveryFee===0?'#FF8A00':'#0F172A'};">${isSelfPickup||deliveryFee===0?'FREE 🎉':'₹'+deliveryFee.toFixed(2)}</td>
        </tr>
        ${walletRow}
        <tr style="background:#FF8A00;">
          <td colspan="2" style="padding:14px 16px;color:#FFF;font-size:16px;font-weight:800;">Total Paid</td>
          <td style="padding:14px 16px;text-align:right;color:#FFF;font-size:18px;font-weight:900;">₹${totalAmt.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- Payment Method -->
    <div style="margin:16px 32px;background:#FFF7ED;border-radius:12px;padding:14px 20px;border:1px solid #FFEDD5;display:flex;align-items:center;gap:12px;">
      <span style="font-size:22px;">${payMethod==='RAZORPAY'?'💳':payMethod==='WALLET'?'👛':'💵'}</span>
      <div>
        <p style="margin:0;font-size:12px;color:#64748B;font-weight:600;">Payment Method</p>
        <p style="margin:4px 0 0;font-size:14px;font-weight:800;color:#C2410C;">${payLabel}</p>
      </div>
    </div>

    <!-- Self Pickup Note -->
    ${isSelfPickup ? `
    <div style="margin:0 32px 16px;background:#F8FAFC;border-radius:12px;padding:14px 20px;border:1px solid #E2E8F0;">
      <p style="margin:0;font-size:13px;font-weight:800;color:#0F172A;">📍 Pickup Instructions</p>
      <p style="margin:6px 0 0;font-size:13px;color:#334155;line-height:20px;">Show this email at <strong>${shopName}</strong> and quote order <strong>#${orderNumber}</strong> to collect your items.</p>
    </div>` : ''}

    <!-- Footer -->
    <div style="padding:24px 32px;text-align:center;border-top:1px solid #F1F5F9;margin-top:16px;">
      <p style="margin:0;font-size:13px;color:#64748B;">Questions? Contact us at <a href="mailto:support@bazarchowk.com" style="color:#FF8A00;text-decoration:none;font-weight:700;">support@bazarchowk.com</a></p>
      <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">© ${new Date().getFullYear()} BazarChowk · Your Local Market, Delivered</p>
    </div>

  </div>
</body>
</html>`;

    const pdfBuffer = await this.generateOrderPDF(name, orderNumber, items, totalAmt, options);

    try {
      await this.transporter.sendMail({
        from: `"BazarChowk" <${process.env.SMTP_USER}>`,
        to,
        subject: `🧾 Your Receipt for Order #${orderNumber} — BazarChowk`,
        html,
        attachments: [
          {
            filename: `BazarChowk_Receipt_${orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      await this.prisma.emailLog.create({
        data: { toEmail: to, subject: `Receipt #${orderNumber}`, type: 'INVOICE', status: 'SENT' }
      });
      this.logger.log(`Invoice email sent to ${to} for order ${orderNumber}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Invoice email failed: ${error.message}`);
      await this.prisma.emailLog.create({
        data: { toEmail: to, subject: `Receipt #${orderNumber}`, type: 'INVOICE', status: 'FAILED', error: error.message }
      }).catch(() => {});
      return false;
    }
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

      const logoPath = path.join(__dirname, 'templates', 'logo.png');
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
