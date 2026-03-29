import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardCacheService } from '../cache/dashboard-cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardCacheService, DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
