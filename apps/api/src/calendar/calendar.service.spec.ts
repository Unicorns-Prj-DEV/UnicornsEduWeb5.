jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  const mockPrisma = {
    class: {
      findMany: jest.fn(),
    },
    makeupScheduleEvent: {
      findMany: jest.fn(),
    },
    studentExamSchedule: {
      findMany: jest.fn(),
    },
  };
  const googleCalendarService = {};

  let service: CalendarService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.class.findMany.mockResolvedValue([]);
    mockPrisma.makeupScheduleEvent.findMany.mockResolvedValue([]);
    mockPrisma.studentExamSchedule.findMany.mockResolvedValue([]);

    service = new CalendarService(
      mockPrisma as never,
      googleCalendarService as never,
      { ensureTutorMeetLink: jest.fn().mockResolvedValue(null) } as never,
    );
  });

  it('scopes teacher calendar exam queries by current teacher ownership and running-class membership', async () => {
    mockPrisma.studentExamSchedule.findMany.mockResolvedValue([
      {
        id: 'exam-1',
        studentId: 'student-1',
        examDate: new Date('2026-05-11T00:00:00.000Z'),
        note: 'Thi cuối kỳ',
        student: {
          fullName: 'Nguyễn Minh Anh',
          studentClasses: [
            {
              class: {
                id: 'class-1',
                name: 'Toán 9A',
              },
            },
          ],
        },
      },
    ]);

    const result = await service.getStaffScheduleEvents('teacher-1', {
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    } as never);

    const examQuery =
      mockPrisma.studentExamSchedule.findMany.mock.calls[0]?.[0];

    expect(examQuery.where).toMatchObject({
      examDate: {
        gte: expect.any(Date),
        lte: expect.any(Date),
      },
      student: {
        studentClasses: {
          some: {
            class: {
              status: 'running',
              teachers: {
                some: {
                  teacherId: 'teacher-1',
                },
              },
            },
          },
        },
      },
    });
    expect(
      examQuery.include.student.include.studentClasses.where,
    ).toMatchObject({
      class: {
        status: 'running',
        teachers: {
          some: {
            teacherId: 'teacher-1',
          },
        },
      },
    });

    expect(result).toEqual({
      success: true,
      total: 1,
      data: [
        expect.objectContaining({
          occurrenceId: 'exam:exam-1',
          type: 'exam',
          title: 'Lịch thi - Nguyễn Minh Anh',
          classId: 'class-1',
          classIds: ['class-1'],
          className: 'Toán 9A',
          classNames: ['Toán 9A'],
          studentId: 'student-1',
          studentName: 'Nguyễn Minh Anh',
          note: 'Thi cuối kỳ',
          allDay: true,
        }),
      ],
    });
  });

  it('includes classId filters when building teacher exam scope', async () => {
    await service.getStaffScheduleEvents('teacher-7', {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      classId: 'class-7',
    } as never);

    const examQuery =
      mockPrisma.studentExamSchedule.findMany.mock.calls[0]?.[0];

    expect(examQuery.where).toMatchObject({
      student: {
        studentClasses: {
          some: {
            class: {
              id: 'class-7',
              teachers: {
                some: {
                  teacherId: 'teacher-7',
                },
              },
            },
          },
        },
      },
    });
    expect(
      examQuery.include.student.include.studentClasses.where,
    ).toMatchObject({
      classId: 'class-7',
      class: {
        teachers: {
          some: {
            teacherId: 'teacher-7',
          },
        },
      },
    });
  });
});
