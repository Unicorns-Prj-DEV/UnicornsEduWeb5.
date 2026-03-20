import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CostController } from './cost.controller';
import { CostService } from './cost.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [CostController],
  providers: [CostService],
  exports: [CostService],
})
export class CostModule {}
