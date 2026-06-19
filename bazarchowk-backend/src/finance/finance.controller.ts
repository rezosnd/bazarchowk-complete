import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { RecordExpenseDto, RecordTransactionDto, FinanceReportQueryDto } from './dto/finance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Accounting & Finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('accounts')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get all finance accounts and their balances' })
  getAccounts() {
    return this.financeService.getAccountBalances();
  }

  @Get('accounts/:accountId/ledger')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get ledger entries for a specific account' })
  getLedger(
    @Param('accountId') accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.financeService.getLedgerEntries(accountId, Number(page || 1), Number(limit || 50));
  }

  @Post('expenses')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Record a business expense' })
  recordExpense(@Body() dto: RecordExpenseDto, @CurrentUser() user: any) {
    return this.financeService.recordExpense(user.id, dto);
  }

  @Get('expenses')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get recorded expenses' })
  getExpenses(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.financeService.getExpenses(Number(page || 1), Number(limit || 50));
  }

  @Post('transactions')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN', 'SYSTEM')
  @ApiOperation({ summary: 'Record a raw financial transaction (Bank/Razorpay)' })
  recordTransaction(@Body() dto: RecordTransactionDto) {
    return this.financeService.recordTransaction(dto);
  }

  @Patch('transactions/:transactionId/status')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN', 'SYSTEM')
  @ApiOperation({ summary: 'Update transaction status (e.g., PENDING -> SUCCESS)' })
  updateTransactionStatus(
    @Param('transactionId') transactionId: string,
    @Body('status') status: string
  ) {
    return this.financeService.updateTransactionStatus(transactionId, status);
  }

  @Get('reports/pnl')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Get Profit & Loss Report for a date range' })
  getPnlReport(@Query() query: FinanceReportQueryDto) {
    return this.financeService.getProfitAndLossReport(query);
  }
}
