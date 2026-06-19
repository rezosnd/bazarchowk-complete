import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RedeemPointsDto } from './dto/redeem-points.dto';

@ApiTags('Loyalty & Rewards')
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user loyalty points, code, and history' })
  getLoyaltyAccount(@CurrentUser() user: any) {
    return this.loyaltyService.getLoyaltyAccount(user.id);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem points for Wallet Cash (10 points = ₹1)' })
  redeemPoints(@Body() dto: RedeemPointsDto, @CurrentUser() user: any) {
    return this.loyaltyService.redeemPoints(user.id, dto.points);
  }

  @Post('referral')
  @ApiOperation({ summary: 'Apply a referral code to get bonus points' })
  applyReferral(@Body('referralCode') code: string, @CurrentUser() user: any) {
    return this.loyaltyService.processReferral(user.id, code);
  }
}
