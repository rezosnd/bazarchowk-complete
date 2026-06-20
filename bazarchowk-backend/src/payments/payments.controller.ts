import { Controller, Post, Get, Body, UseGuards, Headers, Req, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all payments' })
  getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Razorpay checkout for an order' })
  createOrder(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.createPaymentLink(user.id, dto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Razorpay signature after checkout' })
  verifyPayment(@Body() dto: VerifyPaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.verifyPayment(user.id, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay Webhook for payment events' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any
  ) {
    return this.paymentsService.handleWebhook(signature, payload);
  }

  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a paid order (Admin)' })
  async refundOrder(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any
  ) {
    return this.paymentsService.refundPayment(orderId, user.id, reason || 'Requested by Admin');
  }
}
