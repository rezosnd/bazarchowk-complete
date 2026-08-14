import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { OrderStateMachineService } from './order-state-machine.service';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStateMachineService],
  exports: [OrdersService, OrderStateMachineService],
})
export class OrdersModule {}
