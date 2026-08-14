import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CashVerificationService } from './cash-verification.service';
import { SubmitCashDto, VerifyCashDto } from './dto/cash-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Rider Cash Verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-verification')
export class CashVerificationController {
  constructor(private readonly cashVerificationService: CashVerificationService) {}

  @Post('submit')
  @Roles('DELIVERY_PARTNER', 'RIDER')
  @ApiOperation({ summary: 'Rider submits physical cash at a hub' })
  submitCash(@CurrentUser() user: any, @Body() dto: SubmitCashDto) {
    return this.cashVerificationService.submitCash(user.id, dto);
  }

  @Post(':id/verify')
  @Roles('SUPER_ADMIN', 'MARKET_ADMIN')
  @ApiOperation({ summary: 'Admin physically counts and verifies the cash submission' })
  verifyCash(
    @CurrentUser() user: any,
    @Param('id') verificationId: string,
    @Body() dto: VerifyCashDto
  ) {
    return this.cashVerificationService.verifyCash(user.id, verificationId, dto);
  }

  @Get('my-history')
  @Roles('DELIVERY_PARTNER', 'RIDER')
  @ApiOperation({ summary: 'Rider views their past cash submissions and receipts' })
  getMyHistory(@CurrentUser() user: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.cashVerificationService.getRiderHistory(user.id, Number(page || 1), Number(limit || 20));
  }

  @Get('pending')
  @Roles('SUPER_ADMIN', 'MARKET_ADMIN')
  @ApiOperation({ summary: 'Admin views all pending rider cash drops at their hub' })
  getPendingVerifications(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.cashVerificationService.getPendingVerifications(Number(page || 1), Number(limit || 50));
  }

  @Get('reconciliation')
  @Roles('SUPER_ADMIN', 'MARKET_ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Generate daily reconciliation report for a specific date' })
  getDailyReconciliation(@Query('date') date: string) {
    if (!date) {
      date = new Date().toISOString();
    }
    return this.cashVerificationService.generateDailyReconciliationReport(date);
  }

  @Get('shortages')
  @Roles('SUPER_ADMIN', 'MARKET_ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'View all rider cash shortages' })
  getShortages(
    @Query('page') page?: string, 
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    return this.cashVerificationService.getShortages(Number(page || 1), Number(limit || 50), status);
  }
}
