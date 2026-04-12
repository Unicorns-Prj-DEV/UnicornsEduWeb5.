import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarAdminController } from './calendar-admin.controller';
import { CalendarEventsController } from './calendar-events.controller';
import { CalendarController } from './calendar.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    CalendarAdminController,
    CalendarEventsController,
    CalendarController,
  ],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
