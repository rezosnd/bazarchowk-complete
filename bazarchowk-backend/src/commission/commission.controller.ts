import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CommissionService } from './commission.service';
import { CreateCommissionRuleDto, CalculateCommissionDto } from './dto/commission.dto';

@ApiTags('Commission & Revenue Engine (Module 48)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commission')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // ---- COMMISSION RULE MANAGEMENT (SuperAdmin only) ----

  @Post('rules')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a commission rule (GLOBAL, CITY, CATEGORY, or SHOP scope)' })
  createRule(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionService.createRule(dto);
  }

  @Get('rules')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'List all active commission rules' })
  getAllRules() {
    return this.commissionService.getAllRules();
  }

  @Patch('rules/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a commission rule' })
  updateRule(@Param('id') id: string, @Body() dto: Partial<CreateCommissionRuleDto>) {
    return this.commissionService.updateRule(id, dto);
  }

  @Patch('rules/:id/toggle')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Activate or deactivate a commission rule' })
  toggleRule(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.commissionService.toggleRule(id, body.isActive);
  }

  // ---- COMMISSION CALCULATION ----

  @Post('calculate')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Calculate and record commission for a delivered order' })
  calculateCommission(@Body() dto: CalculateCommissionDto) {
    return this.commissionService.calculateAndRecord(dto);
  }

  @Get('shops/:shopId/history')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SHOP_OWNER')
  @ApiOperation({ summary: 'Get commission history for a specific shop' })
  getShopCommissions(
    @Param('shopId') shopId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.commissionService.getShopCommissionHistory(shopId, Number(page), Number(limit));
  }

  // ---- REVENUE REPORTS ----

  @Get('reports/summary')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Platform revenue summary: total, by type, unsettled breakdown' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'citySlug', required: false })
  getRevenueSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('citySlug') citySlug?: string,
  ) {
    return this.commissionService.getRevenueSummary(new Date(startDate), new Date(endDate), citySlug);
  }

  @Get('reports/city-breakdown')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Revenue breakdown grouped by city and entry type' })
  getCityBreakdown(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.commissionService.getCityRevenueBreakdown(new Date(startDate), new Date(endDate));
  }

  // ---- REVENUE LEDGER ----

  @Get('ledger')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Paginated full revenue ledger with filters' })
  @ApiQuery({ name: 'entryType', required: false })
  @ApiQuery({ name: 'citySlug', required: false })
  getLedger(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('entryType') entryType?: string,
    @Query('citySlug') citySlug?: string,
  ) {
    return this.commissionService.getLedger(Number(page), Number(limit), entryType, citySlug);
  }
}
