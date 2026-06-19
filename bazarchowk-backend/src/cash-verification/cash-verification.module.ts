import { Module } from '@nestjs/common';
import { CashVerificationService } from './cash-verification.service';
import { CashVerificationController } from './cash-verification.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, NotificationsModule, FinanceModule],
  controllers: [CashVerificationController],
  providers: [CashVerificationService],
  exports: [CashVerificationService],
})
export class CashVerificationModule {}
