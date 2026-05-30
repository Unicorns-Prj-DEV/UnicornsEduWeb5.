jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { BadRequestException } from '@nestjs/common';
import { SessionScheduleRulesService } from './session-schedule-rules.service';

describe('SessionScheduleRulesService', () => {
  const prisma = {
    class: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
    },
    makeupScheduleEvent: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: SessionScheduleRulesService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-29T12:00:00'));
    service = new SessionScheduleRulesService(prisma as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows creating a session on the fixed schedule day within the 3 hour window', async () => {
    prisma.class.findUnique.mockResolvedValue({
      schedule: [
        {
          id: 'slot-1',
          dayOfWeek: 1,
          from: '19:00:00',
          to: '20:30:00',
          teacherId: 'teacher-1',
        },
      ],
    });
    prisma.makeupScheduleEvent.findMany.mockResolvedValue([]);

    await expect(
      service.assertSessionMatchesDeclaredSchedule(prisma as never, {
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: new Date(Date.UTC(2026, 4, 18)),
        startTime: '21:59:00',
      }),
    ).resolves.toEqual({});
  });

  it('blocks creating a session when the date has no fixed or makeup schedule', async () => {
    prisma.class.findUnique.mockResolvedValue({
      schedule: [
        {
          id: 'slot-1',
          dayOfWeek: 1,
          from: '19:00:00',
          teacherId: 'teacher-1',
        },
      ],
    });
    prisma.makeupScheduleEvent.findMany.mockResolvedValue([]);

    await expect(
      service.assertSessionMatchesDeclaredSchedule(prisma as never, {
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: new Date(Date.UTC(2026, 4, 19)),
        startTime: '19:00:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks creating a session when start time is more than 3 hours from declared schedule', async () => {
    prisma.class.findUnique.mockResolvedValue({
      schedule: [
        {
          id: 'slot-1',
          dayOfWeek: 1,
          from: '19:00:00',
          teacherId: 'teacher-1',
        },
      ],
    });
    prisma.makeupScheduleEvent.findMany.mockResolvedValue([]);

    await expect(
      service.assertSessionMatchesDeclaredSchedule(prisma as never, {
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: new Date(Date.UTC(2026, 4, 18)),
        startTime: '15:59:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('links an unlinked matching makeup schedule event', async () => {
    const makeupDate = new Date(Date.UTC(2026, 4, 19));
    prisma.class.findUnique.mockResolvedValue({
      schedule: [],
    });
    prisma.makeupScheduleEvent.findMany.mockResolvedValue([
      {
        id: 'makeup-1',
        linkedSessionId: null,
        startTime: new Date('1970-01-01T18:30:00'),
      },
    ]);

    await expect(
      service.assertSessionMatchesDeclaredSchedule(prisma as never, {
        classId: 'class-1',
        teacherId: 'teacher-1',
        date: makeupDate,
        startTime: '19:00:00',
      }),
    ).resolves.toEqual({ makeupEventId: 'makeup-1' });
  });

  it('omits missed alerts once the fixed occurrence has a makeup schedule', async () => {
    prisma.class.findUnique.mockResolvedValue({
      id: 'class-1',
      name: 'IELTS Foundation',
      schedule: [
        {
          id: 'slot-1',
          dayOfWeek: 1,
          from: '08:00:00',
          to: '09:30:00',
          teacherId: 'teacher-1',
        },
      ],
      teachers: [
        {
          teacherId: 'teacher-1',
          teacher: {
            id: 'teacher-1',
            user: {
              first_name: 'An',
              last_name: 'Nguyen',
              email: 'an@example.com',
            },
          },
        },
      ],
    });
    prisma.session.findMany.mockResolvedValue([]);
    prisma.makeupScheduleEvent.findMany.mockResolvedValue([
      {
        classId: 'class-1',
        teacherId: 'teacher-1',
        baselineScheduleEntryId: 'slot-1',
        originalDate: new Date(Date.UTC(2026, 4, 25)),
      },
    ]);

    await expect(
      service.getMissedTeachingAlertsByClass('class-1', 7),
    ).resolves.toEqual([]);
  });
});
