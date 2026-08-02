import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementAutomationService } from './settlement-automation.service';
import { SettlementController } from './settlement.controller';
import { SettlementAutomationController } from './settlement-automation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, NotificationsModule, EmailModule],
  providers: [SettlementService, SettlementAutomationService],
  controllers: [SettlementController, SettlementAutomationController],
  exports: [SettlementService, SettlementAutomationService],
})
export class SettlementModule {}
