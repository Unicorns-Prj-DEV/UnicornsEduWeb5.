import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminOnlyDeleteGuard } from './admin-only-delete.guard';
import { LessonController } from './lesson.controller';
import { LessonManagementGuard } from './lesson-management.guard';
import { LessonService } from './lesson.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [LessonController],
  providers: [LessonService, LessonManagementGuard, AdminOnlyDeleteGuard],
  exports: [LessonService],
})
export class LessonModule {}
