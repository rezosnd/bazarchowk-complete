import { Module, forwardRef } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryRulesController } from './delivery-rules.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, NotificationsModule, RealtimeModule, forwardRef(() => OrdersModule)],
  controllers: [DeliveryController, DeliveryRulesController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
