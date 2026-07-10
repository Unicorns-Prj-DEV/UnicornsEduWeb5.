import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TrainingManagerController } from './training-manager.controller';
import { TrainingManagerService } from './training-manager.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingManagerController],
  providers: [TrainingManagerService],
  exports: [TrainingManagerService],
})
export class TrainingManagerModule {}
