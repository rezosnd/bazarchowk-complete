import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GlobalCacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, GlobalCacheModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
