import { Controller, Get, Post, Body, UseGuards, Param, Patch } from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdType } from '@prisma/client';

@ApiTags('Advertisements')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('active/:type')
  @ApiOperation({ summary: 'Get active ads for customers' })
  getActiveAds(@Param('type') type: AdType) {
    return this.adsService.getActiveAds(type);
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Record ad click' })
  recordClick(@Param('id') id: string) {
    return this.adsService.recordClick(id);
  }

  @Post(':id/impression')
  @ApiOperation({ summary: 'Record ad impression' })
  recordImpression(@Param('id') id: string) {
    return this.adsService.recordImpression(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('plans')
  @ApiOperation({ summary: 'Get available ad plans' })
  getAdPlans() {
    return this.adsService.getAdPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PARTNER')
  @ApiBearerAuth()
  @Post('purchase')
  @ApiOperation({ summary: 'Purchase an Ad Campaign (deducts from wallet)' })
  purchaseAd(@Body() dto: any, @CurrentUser() user: any) {
    return this.adsService.purchaseAd(user.id, dto.shopId, dto.planId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Admin approves an ad campaign' })
  approveAd(@Param('id') id: string) {
    return this.adsService.approveAd(id);
  }
}
