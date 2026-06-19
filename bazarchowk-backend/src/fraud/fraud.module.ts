import { Module, Global } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
