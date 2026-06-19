import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule, HttpModule],
  controllers: [AddressesController],
  providers: [AddressesService],
})
export class AddressesModule {}
