import { BadRequestException, Injectable } from '@nestjs/common';
import { AttendanceStatus } from '../../generated/enums';

function normalizeNullableMoney(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.floor(value);
}

function resolveDerivedTuitionPerSession(
  packageTotal: number | null | undefined,
  packageSession: number | null | undefined,
): number | null {
  if (
    typeof packageTotal !== 'number' ||
    !Number.isFinite(packageTotal) ||
    typeof packageSession !== 'number' ||
    !Number.isFinite(packageSession) ||
    packageSession <= 0
  ) {
    return null;
  }

  return Math.round(packageTotal / packageSession);
}

@Injectable()
export class SessionValidationService {
  parseSessionDate(date: string) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('date không hợp lệ.');
    }
    return parsedDate;
  }

  parseSessionTime(time: string, field: 'startTime' | 'endTime') {
    const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time);

    if (!timeMatch) {
      throw new BadRequestException(`${field} không hợp lệ.`);
    }

    const hours = Number.parseInt(timeMatch[1], 10);
    const minutes = Number.parseInt(timeMatch[2], 10);
    const seconds =
      timeMatch[3] !== undefined ? Number.parseInt(timeMatch[3], 10) : 0;

    const normalizedTime = `${String(hours).padStart(2, '0')}:${String(
      minutes,
    ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const parsedTime = new Date(`1970-01-01T${normalizedTime}`);
    if (Number.isNaN(parsedTime.getTime())) {
      throw new BadRequestException(`${field} không hợp lệ.`);
    }

    return parsedTime;
  }

  validateAttendanceItems(
    attendance:
      | Array<{
          studentId: string;
          status?: AttendanceStatus;
          tuitionFee?: number | null;
        }>
      | undefined,
    options: { required: boolean },
  ) {
    if (attendance === undefined) {
      if (options.required) {
        throw new BadRequestException('attendance là bắt buộc.');
      }
      return;
    }

    if (!Array.isArray(attendance)) {
      throw new BadRequestException('attendance phải là mảng hợp lệ.');
    }

    const studentIds = attendance.map((item) => item?.studentId);
    const hasInvalidStudentId = studentIds.some(
      (studentId) =>
        typeof studentId !== 'string' || studentId.trim().length === 0,
    );

    if (hasInvalidStudentId) {
      throw new BadRequestException('attendance.studentId không hợp lệ.');
    }

    const uniqueStudentIds = new Set(studentIds);
    if (uniqueStudentIds.size !== studentIds.length) {
      throw new BadRequestException('attendance chứa studentId trùng lặp.');
    }

    const hasInvalidTuitionFee = attendance.some((item) => {
      if (item?.tuitionFee === undefined || item?.tuitionFee === null) {
        return false;
      }

      const tuitionFee = Number(item.tuitionFee);
      return !Number.isFinite(tuitionFee) || tuitionFee < 0;
    });

    if (hasInvalidTuitionFee) {
      throw new BadRequestException('attendance.tuitionFee không hợp lệ.');
    }
  }

  normalizeAttendanceTuitionFee(
    value: number | string | null | undefined,
  ): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
      throw new BadRequestException('attendance.tuitionFee không hợp lệ.');
    }

    return Math.floor(normalizedValue);
  }

  resolveDefaultStudentTuitionPerSession(options: {
    customTuitionPerSession?: number | null;
    classTuitionPerSession?: number | null;
    classTuitionPackageTotal?: number | null;
    classTuitionPackageSession?: number | null;
  }): number | null {
    return (
      normalizeNullableMoney(options.customTuitionPerSession) ??
      normalizeNullableMoney(options.classTuitionPerSession) ??
      resolveDerivedTuitionPerSession(
        options.classTuitionPackageTotal,
        options.classTuitionPackageSession,
      )
    );
  }

  resolveAttendanceTuitionFee(
    overrideValue: number | string | null | undefined,
    defaultValue: number | null | undefined,
  ): number | null {
    const normalizedOverride =
      this.normalizeAttendanceTuitionFee(overrideValue);
    if (normalizedOverride !== null) {
      return normalizedOverride;
    }

    return this.normalizeAttendanceTuitionFee(defaultValue);
  }

  isTuitionChargeableStatus(status: AttendanceStatus): boolean {
    return (
      status === AttendanceStatus.present ||
      status === AttendanceStatus.excused
    );
  }

  resolveChargeableAttendanceTuitionFee(
    status: AttendanceStatus,
    overrideValue: number | string | null | undefined,
    defaultValue: number | null | undefined,
  ): number | null {
    if (!this.isTuitionChargeableStatus(status)) {
      return null;
    }

    return this.resolveAttendanceTuitionFee(overrideValue, defaultValue);
  }

  normalizeCoefficient(value: number | null | undefined) {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return undefined;
    }

    return Math.max(0.1, Math.min(9.9, Number(value)));
  }
}
