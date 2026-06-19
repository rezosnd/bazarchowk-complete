import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SettlementService } from './settlement.service';
import {
  RecordCashCollectionDto,
  SubmitRiderDepositDto,
  VerifyDepositDto,
  CreateSettlementDto,
  MarkSettlementPaidDto,
} from './dto/settlement.dto';

@ApiTags('Cash Collection & Settlement (Module 46)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settlement')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  // ---- RIDER ENDPOINTS ----

  @Post('cash/record')
  @UseGuards(RolesGuard)
  @Roles('DELIVERY_PARTNER')
  @ApiOperation({ summary: 'Rider: Record cash collected for a COD order after delivery' })
  recordCashCollection(@Body() dto: RecordCashCollectionDto, @CurrentUser() user: any) {
    return this.settlementService.recordCashCollection(user.id, dto);
  }

  @Get('cash/my-summary')
  @UseGuards(RolesGuard)
  @Roles('DELIVERY_PARTNER')
  @ApiOperation({ summary: 'Rider: Get outstanding cash collections and total due' })
  getRiderCashSummary(@CurrentUser() user: any) {
    return this.settlementService.getRiderCashSummary(user.id);
  }

  @Post('deposits/submit')
  @UseGuards(RolesGuard)
  @Roles('DELIVERY_PARTNER')
  @ApiOperation({ summary: 'Rider: Submit a batch of collected cash to market admin' })
  submitDeposit(@Body() dto: SubmitRiderDepositDto, @CurrentUser() user: any) {
    return this.settlementService.submitRiderDeposit(user.id, dto);
  }

  // ---- MARKET ADMIN ENDPOINTS ----

  @Get('deposits/pending')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Get all pending rider cash deposits awaiting verification' })
  getPendingDeposits() {
    return this.settlementService.getPendingDeposits();
  }

  @Patch('deposits/:id/verify')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Verify or reject a rider cash deposit' })
  verifyDeposit(@Param('id') id: string, @Body() dto: VerifyDepositDto, @CurrentUser() user: any) {
    return this.settlementService.verifyDeposit(id, user.id, dto);
  }

  // ---- SETTLEMENT MANAGEMENT ----

  @Post('shops/create')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Generate a settlement for a shop for a given date range' })
  createSettlement(@Body() dto: CreateSettlementDto, @CurrentUser() user: any) {
    return this.settlementService.createShopSettlement(user.id, dto);
  }

  @Get('shops/list')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: List all shop settlements with filters' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'status', required: false })
  getSettlements(
    @Query('shopId') shopId?: string,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.settlementService.getSettlements(shopId, status, Number(page), Number(limit));
  }

  @Patch('shops/:id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'SuperAdmin: Mark a settlement as COMPLETED with payment reference' })
  markPaid(@Param('id') id: string, @Body() dto: MarkSettlementPaidDto) {
    return this.settlementService.markSettlementPaid(id, dto);
  }

  // ---- REPORTS ----

  @Get('reports/summary')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Admin: Platform-wide settlement report with commission earnings' })
  getReport(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.settlementService.getSettlementReport(new Date(startDate), new Date(endDate));
  }
}
