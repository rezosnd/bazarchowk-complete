import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('global-revenue')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get global platform revenue' })
  getGlobalRevenue(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.analyticsService.getGlobalRevenue(new Date(startDate), new Date(endDate));
  }

  @Get('active-users')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get DAU and MAU' })
  getActiveUsers() {
    return this.analyticsService.getActiveUsers();
  }

  @Get('funnels')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get conversion funnels' })
  getFunnelMetrics() {
    return this.analyticsService.getFunnelMetrics();
  }

  @Get('shop/:shopId')
  @Roles('PARTNER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get dashboard metrics for a specific shop' })
  getShopAnalytics(
    @Param('shopId') shopId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.analyticsService.getShopAnalytics(shopId, new Date(startDate), new Date(endDate));
  }
}
