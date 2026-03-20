import { Module } from '@nestjs/common';
import { ActionHistoryModule } from '../action-history/action-history.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffOpsSessionController } from './staff-ops-session.controller';
import { StaffOperationsModule } from 'src/staff-ops/staff-operations.module';
import { SessionCreateService } from './session-create.service';
import { SessionUpdateService } from './session-update.service';
import { SessionDeleteService } from './session-delete.service';
import { SessionReportingService } from './session-reporting.service';
import { SessionValidationService } from './session-validation.service';
import { SessionStudentBalanceService } from './session-student-balance.service';
import { SessionLedgerService } from './session-ledger.service';
import { SessionRosterService } from './session-roster.service';
import { SessionSnapshotService } from './session-snapshot.service';

@Module({
  imports: [PrismaModule, StaffOperationsModule, ActionHistoryModule],
  controllers: [SessionController, StaffOpsSessionController],
  providers: [
    SessionService,
    SessionCreateService,
    SessionUpdateService,
    SessionDeleteService,
    SessionReportingService,
    SessionValidationService,
    SessionStudentBalanceService,
    SessionLedgerService,
    SessionRosterService,
    SessionSnapshotService,
  ],
})
export class SessionModule {}
