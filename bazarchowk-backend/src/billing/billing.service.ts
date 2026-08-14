import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceType, InvoiceStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
const PDFDocument = require('pdfkit');
import * as nodemailer from 'nodemailer';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Complete Enterprise Billing Engine (Swiggy/Instamart Style)
   */
  async generateOrderInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        deliveryAddress: true,
        shop: { include: { documents: true } },
        items: { include: { productVariant: { include: { product: true } } } }
      }
    });

    if (!order) throw new NotFoundException('Order not found');

    const invoiceNumber = `INV-ORD-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const subtotal = order.subtotal;
    const cgst = order.taxAmount / 2;
    const sgst = order.taxAmount / 2;
    const grandTotal = order.totalAmount;

    // Build the master invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        type: InvoiceType.ORDER,
        status: InvoiceStatus.ISSUED,
        userId: order.customerId,
        shopId: order.shopId,
        orderId: order.id,
        referenceId: order.orderNumber,
        
        billingName: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim(),
        billingAddress: order.deliveryAddress 
          ? `${order.deliveryAddress.addressLine1}, ${order.deliveryAddress.city}`
          : 'Self Pickup',
        billingPhone: order.customer.phone || '',
        
        supplierName: order.shop.name,
        supplierAddress: `${order.shop.address}, ${order.shop.city}`,
        
        subtotal,
        totalDiscount: order.discount,
        totalTax: order.taxAmount,
        grandTotal,
        
        items: {
          create: order.items.map(item => ({
            name: item.productVariant.product.name,
            quantity: item.quantity,
            unitPrice: item.priceAtTime,
            totalPrice: item.priceAtTime * item.quantity
          }))
        },
        taxes: {
          create: [
            { taxName: 'CGST', taxRate: 9.0, taxAmount: cgst },
            { taxName: 'SGST', taxRate: 9.0, taxAmount: sgst }
          ]
        }
      },
      include: { items: true, taxes: true }
    });

    const pdfBuffer = await this.generatePdfBuffer(invoice);
    
    // In production, we upload this buffer to S3. Here we simulate S3 URL generation.
    const pdfUrl = `https://cdn.bazarchowk.com/invoices/${invoice.invoiceNumber}.pdf`;
    
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfUrl }
    });

    if (order.customer.email) {
      await this.sendInvoiceEmail(order.customer.email, invoice, pdfBuffer);
      await this.prisma.invoiceEmail.create({
        data: {
          invoiceId: invoice.id,
          emailTo: order.customer.email,
          status: 'SENT'
        }
      });
    }

    return updatedInvoice;
  }

  async generateSettlementInvoice(shopId: string, amount: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, include: { owner: true } });
    if (!shop) throw new NotFoundException('Shop not found');

    const invoiceNumber = `INV-SET-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const commissionRate = 0.10; // 10% platform commission
    const commission = amount * commissionRate;
    const cgst = commission * 0.09;
    const sgst = commission * 0.09;
    const grandTotal = commission + cgst + sgst;

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        type: InvoiceType.SETTLEMENT,
        status: InvoiceStatus.ISSUED,
        shopId: shop.id,
        userId: shop.ownerId,
        referenceId: `SETTLEMENT-${Date.now()}`,
        
        billingName: shop.name,
        billingAddress: shop.address,
        supplierName: "BazarChowk Pvt Ltd",
        supplierAddress: "Dhanbad, Jharkhand, India",
        
        subtotal: commission,
        totalTax: cgst + sgst,
        grandTotal,
        
        items: {
          create: [{ name: 'Platform Commission', quantity: 1, unitPrice: commission, totalPrice: commission }]
        },
        taxes: {
          create: [
            { taxName: 'CGST', taxRate: 9.0, taxAmount: cgst },
            { taxName: 'SGST', taxRate: 9.0, taxAmount: sgst }
          ]
        }
      }
    });
  }

  async generateRefundCreditNote(invoiceId: string, amount: number, reason: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const creditNoteNum = `CN-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const creditNote = await this.prisma.creditNote.create({
      data: {
        creditNoteNum,
        invoiceId,
        reason,
        amount
      }
    });

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.REFUNDED }
    });

    return creditNote;
  }

  async getAllInvoices() {
    return this.prisma.invoice.findMany({
      orderBy: { issuedAt: 'desc' },
      include: { items: true, taxes: true, creditNotes: true, payments: true }
    });
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, taxes: true, creditNotes: true, payments: true }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    
    if (invoice.userId) {
       await this.prisma.invoiceDownload.create({
         data: { invoiceId: invoice.id, userId: invoice.userId }
       });
    }

    return invoice;
  }

  private async generatePdfBuffer(invoice: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.fontSize(25).text('TAX INVOICE', { align: 'center' });
      doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNumber}`);
      doc.text(`Date: ${invoice.issuedAt}`);
      doc.moveDown();
      doc.text(`Billed To: ${invoice.billingName}`);
      doc.text(invoice.billingAddress);
      doc.moveDown();
      doc.text(`Grand Total: Rs. ${invoice.grandTotal}`);
      doc.end();
    });
  }

  private async sendInvoiceEmail(to: string, invoice: any, pdfBuffer: Buffer) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: `"BazarChowk Billing" <${process.env.SMTP_USER}>`,
        to,
        subject: `Your BazarChowk Invoice: ${invoice.invoiceNumber}`,
        text: `Dear ${invoice.billingName},\n\nPlease find attached your invoice ${invoice.invoiceNumber} for Rs. ${invoice.grandTotal}.\n\nThank you for shopping with BazarChowk!`,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      // In production, log to Sentry or retry via BullMQ
    }
  }
}
