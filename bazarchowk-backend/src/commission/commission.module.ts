import { Module } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { CommissionController } from './commission.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [CommissionService],
  controllers: [CommissionController],
  exports: [CommissionService], // Exported so OrdersModule can call calculateAndRecord on DELIVERED
})
export class CommissionModule {}
