import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Initiate Razorpay checkout for an order' })
  createOrder(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.createRazorpayOrder(user.id, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay signature after checkout' })
  verifyPayment(@Body() dto: VerifyPaymentDto, @CurrentUser() user: any) {
    return this.paymentsService.verifyPayment(user.id, dto);
  }
}
