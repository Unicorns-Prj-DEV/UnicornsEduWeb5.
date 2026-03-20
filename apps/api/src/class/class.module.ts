import { Module } from '@nestjs/common';
import { ActionHistoryModule } from 'src/action-history/action-history.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffOperationsModule } from 'src/staff-ops/staff-operations.module';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { StaffOpsClassController } from './staff-ops-class.controller';

@Module({
  imports: [PrismaModule, StaffOperationsModule, ActionHistoryModule],
  controllers: [ClassController, StaffOpsClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
