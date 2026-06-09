import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AssistantCommissionController } from './assistant-commission.controller';
import { AssistantCommissionService } from './assistant-commission.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssistantCommissionController],
  providers: [AssistantCommissionService],
  exports: [AssistantCommissionService],
})
export class AssistantCommissionModule {}
