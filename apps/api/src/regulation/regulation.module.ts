import { Module } from '@nestjs/common';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RegulationController } from './regulation.controller';
import { RegulationService } from './regulation.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [RegulationController],
  providers: [RegulationService],
})
export class RegulationModule {}
