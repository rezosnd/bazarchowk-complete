import { Module } from '@nestjs/common';
import { VoiceOrderingService } from './voice-ordering.service';
import { VoiceOrderingController } from './voice-ordering.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [PrismaModule, CartModule, OrdersModule, AppointmentsModule, GeminiModule],
  controllers: [VoiceOrderingController],
  providers: [VoiceOrderingService],
})
export class VoiceOrderingModule {}
