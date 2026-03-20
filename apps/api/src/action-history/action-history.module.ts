import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActionHistoryController } from './action-history.controller';
import { ActionHistoryQueryService } from './action-history-query.service';
import { ActionHistoryService } from './action-history.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActionHistoryController],
  providers: [ActionHistoryService, ActionHistoryQueryService],
  exports: [ActionHistoryService],
})
export class ActionHistoryModule {}
