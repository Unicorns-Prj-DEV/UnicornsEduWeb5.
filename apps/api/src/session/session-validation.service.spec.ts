import { BadRequestException } from '@nestjs/common';
import { AttendanceStatus } from '../../generated/enums';
import { SessionValidationService } from './session-validation.service';

describe('SessionValidationService', () => {
  let service: SessionValidationService;

  beforeEach(() => {
    service = new SessionValidationService();
  });

  it('requires attendance when the caller marks it as required', () => {
    expect(() =>
      service.validateAttendanceItems(undefined, { required: true }),
    ).toThrow(new BadRequestException('attendance là bắt buộc.'));
  });

  it('rejects duplicate student ids inside attendance payload', () => {
    expect(() =>
      service.validateAttendanceItems(
        [
          { studentId: 'student-1', status: AttendanceStatus.present },
          { studentId: 'student-1', status: AttendanceStatus.absent },
        ],
        { required: true },
      ),
    ).toThrow(new BadRequestException('attendance chứa studentId trùng lặp.'));
  });

  it('rejects negative tuition fee overrides', () => {
    expect(() =>
      service.validateAttendanceItems(
        [
          {
            studentId: 'student-1',
            status: AttendanceStatus.present,
            tuitionFee: -1,
          },
        ],
        { required: true },
      ),
    ).toThrow(new BadRequestException('attendance.tuitionFee không hợp lệ.'));
  });

  it('uses default tuition when present attendance has no override', () => {
    expect(
      service.resolveChargeableAttendanceTuitionFee(
        AttendanceStatus.present,
        undefined,
        180000,
      ),
    ).toBe(180000);
  });

  it('uses default tuition when excused attendance has no override', () => {
    expect(
      service.resolveChargeableAttendanceTuitionFee(
        AttendanceStatus.excused,
        undefined,
        180000,
      ),
    ).toBe(180000);
  });

  it('derives default tuition from class package when class per-session fee is unset', () => {
    expect(
      service.resolveDefaultStudentTuitionPerSession({
        customTuitionPerSession: null,
        classTuitionPerSession: null,
        classTuitionPackageTotal: 3600000,
        classTuitionPackageSession: 12,
      }),
    ).toBe(300000);
  });

  it('drops tuition when attendance is absent', () => {
    expect(
      service.resolveChargeableAttendanceTuitionFee(
        AttendanceStatus.absent,
        180000,
        180000,
      ),
    ).toBeNull();
  });

  it('isTuitionChargeableStatus returns true for present and excused', () => {
    expect(
      service.isTuitionChargeableStatus(AttendanceStatus.present),
    ).toBe(true);
    expect(
      service.isTuitionChargeableStatus(AttendanceStatus.excused),
    ).toBe(true);
    expect(
      service.isTuitionChargeableStatus(AttendanceStatus.absent),
    ).toBe(false);
  });

  it('clamps coefficient into supported range', () => {
    expect(service.normalizeCoefficient(undefined)).toBeUndefined();
    expect(service.normalizeCoefficient(0)).toBe(0.1);
    expect(service.normalizeCoefficient(12)).toBe(9.9);
  });

  it('rejects invalid session date strings', () => {
    expect(() => service.parseSessionDate('2026-13-40')).toThrow(
      new BadRequestException('date không hợp lệ.'),
    );
  });
});
