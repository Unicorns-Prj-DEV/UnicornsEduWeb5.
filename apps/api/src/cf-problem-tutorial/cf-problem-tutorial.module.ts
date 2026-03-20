import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { CfProblemTutorialController } from './cf-problem-tutorial.controller';
import { CfProblemTutorialService } from './cf-problem-tutorial.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [CfProblemTutorialController],
  providers: [CfProblemTutorialService],
})
export class CfProblemTutorialModule {}
