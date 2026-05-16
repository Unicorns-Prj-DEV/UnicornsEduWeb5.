import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { GoogleCalendarModule } from 'src/google-calendar/google-calendar.module';
import { MailModule } from 'src/mail/mail.module';
import { NotificationModule } from 'src/notification/notification.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SePayModule } from 'src/sepay/sepay.module';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ActionHistoryModule,
    GoogleCalendarModule,
    MailModule,
    NotificationModule,
    SePayModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
