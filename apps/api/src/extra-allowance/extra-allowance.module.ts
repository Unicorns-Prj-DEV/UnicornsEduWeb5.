import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExtraAllowanceController } from './extra-allowance.controller';
import { ExtraAllowanceService } from './extra-allowance.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [ExtraAllowanceController],
  providers: [ExtraAllowanceService],
  exports: [ExtraAllowanceService],
})
export class ExtraAllowanceModule {}
