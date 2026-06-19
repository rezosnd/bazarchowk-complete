import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [RealtimeService, RealtimeGateway],
  exports: [RealtimeGateway], // Exported so other modules like OrdersModule could use it if needed
})
export class RealtimeModule {}
