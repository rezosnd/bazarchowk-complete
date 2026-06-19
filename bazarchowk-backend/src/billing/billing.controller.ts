import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Billing & Invoicing')
@Controller('billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('invoice/order/:orderId')
  @ApiOperation({ summary: 'Generate Order Tax Invoice (Swiggy Style)' })
  generateOrderInvoice(@Param('orderId') orderId: string) {
    return this.billingService.generateOrderInvoice(orderId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('invoice/settlement/:shopId')
  @ApiOperation({ summary: 'Generate Settlement Invoice for Shop (Admin)' })
  generateSettlementInvoice(@Param('shopId') shopId: string, @Body('amount') amount: number) {
    return this.billingService.generateSettlementInvoice(shopId, amount);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('refund')
  @ApiOperation({ summary: 'Generate Credit Note for Refund' })
  generateRefundCreditNote(@Body('invoiceId') invoiceId: string, @Body('amount') amount: number, @Body('reason') reason: string) {
    return this.billingService.generateRefundCreditNote(invoiceId, amount, reason);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get all invoices (Admin/Customer history)' })
  getAllInvoices() {
    return this.billingService.getAllInvoices();
  }

  @Get('invoice/:id')
  @ApiOperation({ summary: 'Download/View specific Invoice' })
  getInvoice(@Param('id') id: string) {
    return this.billingService.getInvoiceById(id);
  }
}
