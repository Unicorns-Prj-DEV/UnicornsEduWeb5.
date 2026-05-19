import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarAdminController } from './calendar-admin.controller';
import { CalendarController } from './calendar.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StaffOperationsModule } from '../staff-ops/staff-operations.module';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';
import { StaffModule } from '../staff/staff.module';
import { ActionHistoryModule } from '../action-history/action-history.module';

@Module({
  imports: [
    PrismaModule,
    StaffOperationsModule,
    GoogleCalendarModule,
    StaffModule,
    ActionHistoryModule,
  ],
  controllers: [CalendarAdminController, CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
