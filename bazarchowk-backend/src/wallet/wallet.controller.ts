import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AddFundsDto } from './dto/add-funds.dto';
import { TransactionReason } from '@prisma/client';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wallet and recent transactions' })
  getWallet(@CurrentUser() user: any) {
    return this.walletService.getWallet(user.id);
  }

  @Post('deposit/create-link')
  @ApiOperation({ summary: 'Create Razorpay payment link for wallet deposit' })
  createDepositLink(
    @Body('amount') amount: number,
    @Body('redirectUri') redirectUri: string,
    @CurrentUser() user: any
  ) {
    return this.walletService.createDepositLink(user.id, amount, redirectUri);
  }

  @Post('deposit/verify')
  @ApiOperation({ summary: 'Verify Razorpay payment for wallet deposit' })
  verifyDeposit(
    @Body('razorpay_payment_id') razorpayPaymentId: string,
    @Body('razorpay_order_id') razorpayOrderId: string,
    @Body('razorpay_signature') razorpaySignature: string,
    @CurrentUser() user: any
  ) {
    return this.walletService.verifyDeposit(
      user.id,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    );
  }
}
