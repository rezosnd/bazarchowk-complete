import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { CommunicationGateway } from './communication.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [CommunicationService, CommunicationGateway],
  controllers: [CommunicationController],
  exports: [CommunicationService, CommunicationGateway]
})
export class CommunicationModule {}
