import { Injectable } from '@nestjs/common';
import {
  SessionCreateDto,
  SessionUnpaidSummaryItem,
  SessionUpdateDto,
} from '../dtos/session.dto';
import { UserRole } from '../../generated/enums';
import { ActionHistoryActor } from '../action-history/action-history.service';
import { SessionCreateService } from './session-create.service';
import { SessionDeleteService } from './session-delete.service';
import { SessionReportingService } from './session-reporting.service';
import { SessionUpdateService } from './session-update.service';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionCreateService: SessionCreateService,
    private readonly sessionUpdateService: SessionUpdateService,
    private readonly sessionDeleteService: SessionDeleteService,
    private readonly sessionReportingService: SessionReportingService,
  ) {}

  createSession(data: SessionCreateDto, actor?: ActionHistoryActor) {
    return this.sessionCreateService.createSession(data, actor);
  }

  createSessionForStaff(
    userId: string,
    roleType: UserRole,
    classId: string,
    data: {
      date: string;
      startTime?: string;
      endTime?: string;
      notes?: string | null;
      attendance: Array<{
        studentId: string;
        status: SessionCreateDto['attendance'][number]['status'];
        notes?: string | null;
      }>;
    },
    actor?: ActionHistoryActor,
  ) {
    return this.sessionCreateService.createSessionForStaff(
      userId,
      roleType,
      classId,
      data,
      actor,
    );
  }

  updateSession(data: SessionUpdateDto, actor?: ActionHistoryActor) {
    return this.sessionUpdateService.updateSession(data, actor);
  }

  updateSessionForStaff(
    userId: string,
    roleType: UserRole,
    sessionId: string,
    data: {
      date?: string;
      startTime?: string;
      endTime?: string;
      notes?: string | null;
      attendance?: Array<{
        studentId: string;
        status: NonNullable<SessionUpdateDto['attendance']>[number]['status'];
        notes?: string | null;
      }>;
    },
    actor?: ActionHistoryActor,
  ) {
    return this.sessionUpdateService.updateSessionForStaff(
      userId,
      roleType,
      sessionId,
      data,
      actor,
    );
  }

  deleteSession(id: string, actor?: ActionHistoryActor) {
    return this.sessionDeleteService.deleteSession(id, actor);
  }

  getSessionsByClassId(classId: string, month: string, year: string) {
    return this.sessionReportingService.getSessionsByClassId(
      classId,
      month,
      year,
    );
  }

  getSessionsByClassIdForStaff(
    userId: string,
    roleType: UserRole,
    classId: string,
    month: string,
    year: string,
  ) {
    return this.sessionReportingService.getSessionsByClassIdForStaff(
      userId,
      roleType,
      classId,
      month,
      year,
    );
  }

  getSessionsByTeacherId(teacherId: string, month: string, year: string) {
    return this.sessionReportingService.getSessionsByTeacherId(
      teacherId,
      month,
      year,
    );
  }

  getUnpaidSessionsByTeacherId(
    teacherId: string,
    days?: number,
  ): Promise<SessionUnpaidSummaryItem[]> {
    return this.sessionReportingService.getUnpaidSessionsByTeacherId(
      teacherId,
      days,
    );
  }
}
