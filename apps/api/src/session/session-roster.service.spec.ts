jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { BadRequestException } from '@nestjs/common';
import { SessionRosterService } from './session-roster.service';
import { SessionValidationService } from './session-validation.service';

describe('SessionRosterService', () => {
  const mockPrisma = {
    studentClass: {
      findMany: jest.fn(),
    },
  };

  let service: SessionRosterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionRosterService(
      mockPrisma as never,
      new SessionValidationService(),
    );
  });

  it('returns the effective default tuition, including class package fallback', async () => {
    mockPrisma.studentClass.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        customStudentTuitionPerSession: null,
        class: {
          studentTuitionPerSession: null,
          tuitionPackageTotal: 3600000,
          tuitionPackageSession: 12,
        },
      },
      {
        studentId: 'student-2',
        customStudentTuitionPerSession: 420000,
        class: {
          studentTuitionPerSession: 300000,
          tuitionPackageTotal: 3600000,
          tuitionPackageSession: 12,
        },
      },
    ]);

    const result = await service.assertAttendanceStudentsBelongToClass(
      'class-1',
      ['student-1', 'student-2'],
    );

    expect(result.get('student-1')).toBe(300000);
    expect(result.get('student-2')).toBe(420000);
  });

  it('rejects student ids that do not belong to the class', async () => {
    mockPrisma.studentClass.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        customStudentTuitionPerSession: null,
        class: {
          studentTuitionPerSession: null,
          tuitionPackageTotal: 3600000,
          tuitionPackageSession: 12,
        },
      },
    ]);

    await expect(
      service.assertAttendanceStudentsBelongToClass('class-1', [
        'student-1',
        'student-2',
      ]),
    ).rejects.toThrow(
      new BadRequestException(
        'attendance chỉ được phép chứa học sinh thuộc lớp học hiện tại.',
      ),
    );
  });
});
