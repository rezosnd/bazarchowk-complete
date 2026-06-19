import { Controller, Post, Get, Param, Query, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SettlementAutomationService } from './settlement-automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GenerateSettlementBatchDto } from './dto/settlement-automation.dto';

@ApiTags('Settlement Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settlement-automation')
export class SettlementAutomationController {
  constructor(private readonly automationService: SettlementAutomationService) {}

  @Post('generate-batch')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Manually trigger a settlement batch generation for a specific period' })
  generateBatch(@Body() dto: GenerateSettlementBatchDto) {
    return this.automationService.generateSettlementBatch(dto.frequency, new Date(dto.periodStart), new Date(dto.periodEnd));
  }

  @Post('batches/:id/approve')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'Approve a generated settlement batch to initiate payouts' })
  approveBatch(@CurrentUser() user: any, @Param('id') batchId: string) {
    return this.automationService.approveSettlementBatch(user.id, batchId);
  }

  @Get('batches')
  @Roles('SUPER_ADMIN', 'FINANCE_MANAGER')
  @ApiOperation({ summary: 'List all settlement batches' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getBatches(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.automationService.getSettlementBatches(Number(page || 1), Number(limit || 20));
  }
}
