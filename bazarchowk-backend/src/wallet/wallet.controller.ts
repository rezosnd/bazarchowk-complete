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

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit funds into wallet manually (Simulation)' })
  deposit(@Body() dto: AddFundsDto, @CurrentUser() user: any) {
    // In production, this would hit Razorpay first, wait for webhook, then credit.
    // For now, this acts as a direct simulation endpoint.
    return this.walletService.credit(user.id, dto.amount, TransactionReason.DEPOSIT, 'Manual deposit');
  }
}
