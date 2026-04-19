import { Module } from '@nestjs/common';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { GoogleCalendarModule } from 'src/google-calendar/google-calendar.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule, GoogleCalendarModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
