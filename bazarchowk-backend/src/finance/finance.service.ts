import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordExpenseDto, RecordTransactionDto, FinanceReportQueryDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== LEDGER / ACCOUNTS ====================

  async ensureAccountExists(name: string, type: string) {
    let account = await this.prisma.financeAccount.findUnique({ where: { name } });
    if (!account) {
      account = await this.prisma.financeAccount.create({
        data: { name, type }
      });
    }
    return account;
  }

  async recordLedgerEntry(accountName: string, amount: number, transactionType: string, referenceId?: string, description?: string) {
    const accountType = amount > 0 ? 'REVENUE' : 'EXPENSE';
    const account = await this.ensureAccountExists(accountName, accountType);

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          amount,
          transactionType,
          referenceId,
          description
        }
      });

      // Update cached balance
      await tx.financeAccount.update({
        where: { id: account.id },
        data: { balance: { increment: amount } }
      });

      return entry;
    }, { isolationLevel: 'Serializable' });
  }

  async getAccountBalances() {
    return this.prisma.financeAccount.findMany({
      orderBy: { type: 'asc' }
    });
  }

  async getLedgerEntries(accountId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { accountId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.ledgerEntry.count({ where: { accountId } })
    ]);
    return { data, total, page, limit };
  }

  // ==================== EXPENSES ====================

  async recordExpense(userId: string, dto: RecordExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        recordedById: userId
      }
    });

    // Also record in the negative ledger
    await this.recordLedgerEntry(
      `Operating Expense: ${dto.category}`,
      -Math.abs(dto.amount),
      'EXPENSE_PAYOUT',
      expense.id,
      dto.description
    );

    this.logger.log(`Expense recorded: ${dto.category} - ₹${dto.amount}`);
    return expense;
  }

  async getExpenses(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { recordedBy: { select: { firstName: true, lastName: true, email: true } } }
      }),
      this.prisma.expense.count()
    ]);
    return { data, total, page, limit };
  }

  // ==================== FINANCIAL TRANSACTIONS ====================

  async recordTransaction(dto: RecordTransactionDto) {
    const existing = await this.prisma.financialTransaction.findUnique({
      where: { transactionId: dto.transactionId }
    });
    if (existing) throw new BadRequestException('Transaction ID already exists');

    return this.prisma.financialTransaction.create({
      data: dto
    });
  }

  async updateTransactionStatus(transactionId: string, status: string) {
    return this.prisma.financialTransaction.update({
      where: { transactionId },
      data: { status }
    });
  }

  // ==================== PROFIT & LOSS REPORT ====================

  async getProfitAndLossReport(query: FinanceReportQueryDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const [revenueEntries, expenseEntries] = await Promise.all([
      // Sum all positive entries in the ledger
      this.prisma.ledgerEntry.aggregate({
        _sum: { amount: true },
        where: {
          amount: { gt: 0 },
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      // Sum all negative entries in the ledger (or sum Expenses directly)
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: startDate, lte: endDate }
        }
      })
    ]);

    const totalRevenue = revenueEntries._sum.amount || 0;
    const totalExpenses = expenseEntries._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenses;

    return {
      period: { startDate, endDate },
      totalRevenue,
      totalExpenses,
      netProfit,
      margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    };
  }
}
