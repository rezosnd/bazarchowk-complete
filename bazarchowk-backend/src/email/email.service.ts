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
  items: {
    orderNumber: string;
    amount: number;
    paymentMethod: string;
    isSelfPickup: boolean;
    commission: number;
    netAmount: number;
  }[];
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
      const platformFee = options?.platformFee ?? 0;
      const isSelfPickup = options?.deliveryType === 'SELF_PICKUP';
      
      let y = doc.y;
      
      const drawTextLine = (label: string, val: string, isBold = false) => {
        doc.fontSize(12).fillColor(isBold ? '#111827' : '#4b5563').text(label, 300, y);
        doc.fontSize(12).fillColor('#111827').text(val, 450, y, { width: 85, align: 'right' });
        y += 20;
      };

      drawTextLine('Item Subtotal:', `Rs. ${subtotal.toFixed(2)}`);
      if (platformFee > 0) {
        drawTextLine('Platform Fee:', `Rs. ${platformFee.toFixed(2)}`);
      }
      drawTextLine('Taxes & GST:', `Rs. ${taxAmount.toFixed(2)}`);
      drawTextLine('Delivery Fee:', isSelfPickup ? 'FREE' : `Rs. ${deliveryFee.toFixed(2)}`);
      if (walletUsed > 0) {
        doc.fillColor('#FF8A00');
        drawTextLine('Wallet Applied:', `-Rs. ${walletUsed.toFixed(2)}`);
        doc.fillColor('#0F172A');
      }
      
      doc.y = y;
      doc.moveDown(1);
      const totalBoxY = doc.y;
      doc.rect(290, totalBoxY, 255, 32).fill('#FF8A00');
      doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(13);
      doc.text('Total Paid:', 300, totalBoxY + 9, { width: 120 });
      doc.text(`Rs. ${totalAmt.toFixed(2)}`, 400, totalBoxY + 9, { width: 135, align: 'right' });
      doc.y = totalBoxY + 40;

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
      platformFee?: number;
      deliveryFee?: number;
      walletAmountUsed?: number;
      paymentMethod?: string;
      deliveryType?: string;
    }
  ) {
    const shopName = options?.shopName || 'BazarChowk Partner';
    const subtotal = options?.subtotal ?? items.reduce((s, i) => s + i.price, 0);
    const taxAmount = options?.taxAmount ?? 0;
    const platformFee = options?.platformFee ?? 0;
    const deliveryFee = options?.deliveryFee ?? 0;
    const walletUsed = options?.walletAmountUsed ?? 0;
    const payMethod = options?.paymentMethod || 'COD';
    const isSelfPickup = options?.deliveryType === 'SELF_PICKUP';
    const payLabel = payMethod === 'RAZORPAY' ? 'Paid Online (UPI/Card)' : isSelfPickup ? 'Pay at Shop (Cash)' : 'Cash on Delivery';

    const platformFeeRow = platformFee > 0 ? `
      <tr>
        <td colspan="2" style="padding:8px 15px;color:#4b5563;font-size:14px;">Platform Fee</td>
        <td style="padding:8px 15px;text-align:right;color:#111827;font-weight:600;font-size:14px;">₹${platformFee.toFixed(2)}</td>
      </tr>` : '';

    const itemRows = items.map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;color:#0F172A;font-size:14px;">${item.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;text-align:center;color:#64748B;font-size:14px;">×${item.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;text-align:right;color:#0F172A;font-weight:700;font-size:14px;">₹${item.price.toFixed(2)}</td>
      </tr>`).join('');

    const walletRow = walletUsed > 0 ? `
      <tr>
        <td colspan="2" style="padding:8px 15px;color:#ea580c;font-size:14px;">Wallet Applied</td>
        <td style="padding:8px 15px;text-align:right;color:#ea580c;font-weight:600;font-size:14px;">-₹${walletUsed.toFixed(2)}</td>
      </tr>` : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
    
    <!-- Logo Header (VeritasCo X BazarChowk) -->
    <div style="padding-bottom: 30px; border-bottom: 1px solid #e5e7eb; margin-bottom: 40px; text-align: center;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
                <td style="vertical-align: middle;">
                    <img src="https://recheck.veritasco.tech/veritasco.png" alt="Veritasco" style="max-height: 35px; display: block;">
                </td>
                <td style="vertical-align: middle; font-size: 18px; font-weight: 300; color: #d1d5db; padding: 0 20px;">&times;</td>
                <td style="vertical-align: middle;">
                    <img src="https://bazarchowk.com/logo.png" alt="BazarChowk" style="max-height: 40px; display: block;">
                </td>
            </tr>
        </table>
    </div>

    <!-- Content -->
    <div>
      <h1 style="color: #111827; font-size: 28px; margin-top: 0; font-weight: 300; letter-spacing: -0.5px; margin-bottom: 30px;">
        Order <strong>#${orderNumber}</strong> Confirmed.
      </h1>

      <p style="line-height: 1.8; color: #4b5563; font-size: 16px; margin-top: 0; margin-bottom: 24px;">Hi ${name},</p>
      <p style="line-height: 1.8; color: #4b5563; font-size: 16px; margin-top: 0; margin-bottom: 30px;">
        Thank you for your order from <strong>${shopName}</strong>. Your official receipt is attached to this email as a PDF. Below is a summary of your purchase.
      </p>

      <!-- Info Boxes -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 35px;">
        <tr>
          <td width="48%" style="background: #ffffff; border: 1px solid #e5e7eb; border-top: 3px solid #111827; padding: 20px; border-radius: 4px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:700;letter-spacing:1px;">Date</p>
            <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#111827;">${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
          </td>
          <td width="4%"></td>
          <td width="48%" style="background: #ffffff; border: 1px solid #e5e7eb; border-top: 3px solid #111827; padding: 20px; border-radius: 4px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:700;letter-spacing:1px;">Fulfillment</p>
            <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#111827;">${isSelfPickup ? 'Self Pickup' : 'Delivery'}</p>
          </td>
        </tr>
      </table>

      <!-- Items -->
      <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 35px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr style="background-color: #f9fafb;">
            <th style="padding:12px 15px;text-align:left;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Item</th>
            <th style="padding:12px 15px;text-align:center;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Qty</th>
            <th style="padding:12px 15px;text-align:right;font-size:12px;color:#6b7280;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">Price</th>
          </tr>
          ${itemRows.replace(/#F1F5F9/g, '#e5e7eb').replace(/#0F172A/g, '#111827').replace(/#64748B/g, '#6b7280')}
          
          <!-- Totals -->
          <tr>
            <td colspan="2" style="padding:12px 15px;color:#4b5563;font-size:14px;border-top:1px solid #e5e7eb;">Subtotal</td>
            <td style="padding:12px 15px;text-align:right;color:#111827;font-weight:600;font-size:14px;border-top:1px solid #e5e7eb;">₹${subtotal.toFixed(2)}</td>
          </tr>
          ${platformFeeRow}
          <tr>
            <td colspan="2" style="padding:8px 15px;color:#4b5563;font-size:14px;">Taxes</td>
            <td style="padding:8px 15px;text-align:right;color:#111827;font-weight:600;font-size:14px;">₹${taxAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:8px 15px;color:#4b5563;font-size:14px;">${isSelfPickup ? 'Delivery' : 'Delivery Fee'}</td>
            <td style="padding:8px 15px;text-align:right;color:${isSelfPickup ? '#16a34a' : '#111827'};font-weight:600;font-size:14px;">${isSelfPickup ? 'FREE' : '₹'+deliveryFee.toFixed(2)}</td>
          </tr>
          ${walletRow}
          <tr style="background-color: #f9fafb;">
            <td colspan="2" style="padding:15px;color:#111827;font-size:16px;font-weight:700;border-top:2px solid #e5e7eb;">Total Paid</td>
            <td style="padding:15px;text-align:right;color:#111827;font-size:18px;font-weight:800;border-top:2px solid #e5e7eb;">₹${totalAmt.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Payment Method -->
      <div style="background-color: #f9fafb; border-radius: 6px; padding: 15px; border: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Payment Method</p>
        <p style="margin: 5px 0 0; font-size: 15px; color: #111827; font-weight: 700;">${payLabel}</p>
      </div>

      <!-- Button -->
      <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
          <a href="https://bazarchowk.com/orders" style="background: #111827; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 4px; font-weight: 600; font-size: 15px; display: inline-block; letter-spacing: 0.5px;">Track Order Status</a>
      </div>

      <!-- Footer -->
      <div style="margin-top: 60px; padding-top: 30px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
        &copy; ${new Date().getFullYear()} Veritasco x BazarChowk Operations.<br>
        This is an automatically generated receipt.
      </div>
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

      doc.moveDown(2);

      // --- ITEMS LIST --- //
      if (details.items && details.items.length > 0) {
        doc.fontSize(14).text('ORDER DETAILS:', { underline: true });
        doc.moveDown(1);
        
        doc.fontSize(10).font('Helvetica-Bold');
        const headerY = doc.y;
        doc.text('Order #', 50, headerY, { width: 80 });
        doc.text('Method', 130, headerY, { width: 80 });
        doc.text('Type', 210, headerY, { width: 80 });
        doc.text('Amt', 290, headerY, { width: 60, align: 'right' });
        doc.text('Comm', 350, headerY, { width: 60, align: 'right' });
        doc.text('Net', 410, headerY, { width: 60, align: 'right' });
        
        doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke('#e5e7eb');
        doc.moveDown(1);

        doc.font('Helvetica');
        details.items.forEach(item => {
          const rowY = doc.y;
          doc.text(item.orderNumber, 50, rowY, { width: 80 });
          doc.text(item.paymentMethod, 130, rowY, { width: 80 });
          doc.text(item.isSelfPickup ? 'Pickup' : 'Delivery', 210, rowY, { width: 80 });
          doc.text(item.amount.toFixed(2), 290, rowY, { width: 60, align: 'right' });
          doc.text(item.commission.toFixed(2), 350, rowY, { width: 60, align: 'right' });
          const netStr = item.netAmount >= 0 ? item.netAmount.toFixed(2) : `(${Math.abs(item.netAmount).toFixed(2)})`;
          doc.text(netStr, 410, rowY, { width: 60, align: 'right' });
          
          doc.x = 50;
          doc.moveDown(0.5);
          
          if (doc.y > 750) doc.addPage();
        });
        
        doc.x = 50;
        doc.moveDown(2);
      }

      // --- SUMMARY --- //
      doc.fontSize(14).text('FINANCIAL SUMMARY:', { underline: true });
      doc.moveDown(1);

      doc.rect(50, doc.y, 495, 25).fill('#fff3e0').stroke('#FF8A00');
      doc.fillColor('#FF8A00').font('Helvetica-Bold').fontSize(12);
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
