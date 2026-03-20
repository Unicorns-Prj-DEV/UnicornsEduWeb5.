import { Module } from '@nestjs/common';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [PrismaModule, ActionHistoryModule],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
