import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, ApplyCouponDto } from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Coupons & Promotions')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SHOP_OWNER')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new coupon (Admin/Shop Owner)' })
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get available coupons' })
  getAllCoupons(@Query('shopId') shopId?: string) {
    return this.couponsService.getAllCoupons(shopId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a coupon to a cart total' })
  applyCoupon(@Req() req: any, @Body() dto: ApplyCouponDto) {
    return this.couponsService.applyCoupon(req.user.userId, dto);
  }
}
