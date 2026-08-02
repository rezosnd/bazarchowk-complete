import { Controller, Get, Post, Body, UseGuards, Param, Patch, Query } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get active ads for customers (filtered by radius)' })
  getActiveAds(@Param('type') type: AdType, @Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.adsService.getActiveAds(type, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined);
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
  @Roles('PARTNER')
  @ApiBearerAuth()
  @Post('purchase/online')
  @ApiOperation({ summary: 'Generate Razorpay order for ad purchase' })
  purchaseOnline(@Body() dto: any, @CurrentUser() user: any) {
    return this.adsService.createOnlinePurchase(user.id, dto.shopId, dto.planId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PARTNER')
  @ApiBearerAuth()
  @Post('purchase/verify')
  @ApiOperation({ summary: 'Verify Razorpay ad purchase' })
  verifyOnline(@Body() dto: any, @CurrentUser() user: any) {
    return this.adsService.verifyOnlinePurchase(
      user.id, 
      dto.shopId, 
      dto.planId, 
      dto.razorpayOrderId, 
      dto.razorpayPaymentId, 
      dto.razorpaySignature, 
      dto
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Admin approves an ad campaign' })
  approveAd(@Param('id') id: string) {
    return this.adsService.approveAd(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Get('admin/all')
  @ApiOperation({ summary: 'Admin fetch all ads' })
  getAllAdsAdmin() {
    return this.adsService.getAllAdsAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Post('plans')
  @ApiOperation({ summary: 'Admin creates a new ad plan' })
  createAdPlan(@Body() dto: { name: string; type: AdType; durationDays: number; price: number }) {
    return this.adsService.createAdPlan(dto.name, dto.type, dto.durationDays, dto.price);
  }
}
