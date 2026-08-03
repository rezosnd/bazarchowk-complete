import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CityService } from './city.service';
import { CreateCityDto, UpdateCityDto, CreateRegionalPromotionDto } from './dto/city.dto';

@ApiTags('Multi-City Architecture')
@Controller('cities')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  // ---- ADMIN ENDPOINTS ----
  // NOTE: These must be defined BEFORE /:slug to avoid NestJS treating 'admin' as a slug param

  @Get('admin/all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Get all cities including inactive ones' })
  getAllCitiesAdmin() {
    return this.cityService.getAllCitiesAdmin();
  }

  @Post('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Create a new city configuration' })
  createCity(@Body() dto: CreateCityDto) {
    return this.cityService.createCity(dto);
  }

  @Patch('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Update city config (pricing, launch status, etc.)' })
  updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.cityService.updateCity(id, dto);
  }

  @Post('admin/:cityId/promotions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Add a regional promotion to a city' })
  addPromotion(@Param('cityId') cityId: string, @Body() dto: CreateRegionalPromotionDto) {
    return this.cityService.addPromotion(cityId, dto);
  }

  // ---- PUBLIC ENDPOINTS ---- (must be after admin routes to avoid slug conflict)

  @Get()
  @ApiOperation({ summary: 'Get all active cities (for city selector in app)' })
  getActiveCities() {
    return this.cityService.getActiveCities();
  }

  @Get('validate-coupon')
  @ApiOperation({ summary: 'Validate a regional promo coupon code for a city' })
  validateCouponGet(@Query('code') couponCode: string, @Query('city') citySlug: string, @Query('amount') orderAmount: number) {
    return this.cityService.validateCoupon(couponCode, citySlug, Number(orderAmount));
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get full city config + active promotions by city slug' })
  getCityBySlug(@Param('slug') slug: string) {
    return this.cityService.getCityBySlug(slug);
  }
