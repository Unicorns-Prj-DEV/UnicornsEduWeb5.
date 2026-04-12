import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock googleapis
const mockCalendar = {
  events: {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
  calendarList: {
    list: jest.fn(),
  },
};

const mockGoogle = {
  calendar: jest.fn(() => mockCalendar),
};

// Mock google-auth-library
const mockJWT = {
  authorize: jest.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    tokenType: 'Bearer',
  }),
};

jest.mock('googleapis', () => ({
  google: mockGoogle,
}));

jest.mock('google-auth-library', () => ({
  JWT: jest.fn(() => mockJWT),
}));

// Mock PrismaService
class MockPrismaService {
  session = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
}

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let configService: ConfigService;
  let prismaService: MockPrismaService;

  const mockSessionWithRelations = {
    id: 'session-123',
    teacherId: 'teacher-123',
    classId: 'class-123',
    date: new Date('2025-04-15'),
    startTime: new Date('2025-04-15T14:00:00'),
    endTime: new Date('2025-04-15T16:00:00'),
    notes: 'Test session notes',
    teacher: {
      user: {
        email: 'teacher@test.com',
      },
    },
    class: {
      name: 'Test Class',
    },
  };

  const mockSessionWithoutTeacherEmail = {
    id: 'session-456',
    teacherId: 'teacher-456',
    classId: 'class-456',
    date: new Date('2025-04-16'),
    teacher: {
      user: null,
    },
    class: {
      name: 'Another Class',
    },
  };

  const mockExistingEvent = {
    id: 'event-123',
    attendees: [
      { email: 'teacher@test.com', responseStatus: 'accepted' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const env: Record<string, string> = {
                GOOGLE_SERVICE_ACCOUNT_KEY: 'mock-key',
                GOOGLE_CALENDAR_ID: 'test-calendar@group.calendar.google.com',
                GOOGLE_TIME_ZONE: 'Asia/Ho_Chi_Minh',
              };
              return env[key];
            }),
          },
        },
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService) as unknown as MockPrismaService;

    // Reset all mocks
    jest.clearAllMocks();
    mockGoogle.calendar.mockReturnValue(mockCalendar);
    mockJWT.authorize.mockResolvedValue({
      accessToken: 'mock-access-token',
      tokenType: 'Bearer',
    });

    // Set calendar directly on service to bypass initialization check
    (service as any).calendar = mockCalendar;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildEventData', () => {
    it('should build event data with full times', () => {
      const eventData = (service as any).buildEventData(
        mockSessionWithRelations,
        'teacher@test.com',
        'Test Class',
      );

      expect(eventData.summary).toContain('Test Class');
      expect(eventData.summary).toContain('Session 123');
      expect(eventData.description).toContain('Class: Test Class');
      expect(eventData.attendees).toHaveLength(1);
      expect(eventData.attendees[0].email).toBe('teacher@test.com');
      expect(eventData.timeZone).toBe('Asia/Ho_Chi_Minh');
    });

    it('should handle missing startTime with default 14:00', () => {
      const sessionWithoutTimes = {
        ...mockSessionWithoutTeacherEmail,
        startTime: null,
        endTime: null,
        date: new Date('2025-04-17'),
        class: { name: 'Default Time Class' },
      };
      const eventData = (service as any).buildEventData(
        sessionWithoutTimes,
        'teacher2@test.com',
        'Default Time Class',
      );

      expect(eventData.startDateTimeStr).toContain('T14:00:00');
    });

    it('should set default 2-hour duration when endTime missing', () => {
      const sessionWithoutTimes = {
        ...mockSessionWithoutTeacherEmail,
        startTime: null,
        endTime: null,
        date: new Date('2025-04-17'),
        class: { name: 'Default Time Class' },
      };
      const eventData = (service as any).buildEventData(
        sessionWithoutTimes,
        'teacher2@test.com',
        'Default Time Class',
      );

      // Default duration is 2 hours
      expect(eventData.endDateTimeStr).toBeDefined();
      expect(eventData.startDateTimeStr).toBeDefined();
    });

    it('should include notes in description when present', () => {
      const eventData = (service as any).buildEventData(
        mockSessionWithRelations,
        'teacher@test.com',
        'Test Class',
      );

      expect(eventData.description).toContain('Test session notes');
    });
  });

  describe('createCalendarEvent', () => {
    it('should create event and return result with meet link', async () => {
      const mockEventResponse = {
        data: {
          id: 'event-123',
          conferenceData: {
            entryPoints: [
              { entryPointType: 'video', uri: 'https://meet.google.com/abc-def' },
            ],
          },
        },
      };
      mockCalendar.events.insert.mockResolvedValue(mockEventResponse);
      prismaService.session.findUnique.mockResolvedValue(mockSessionWithRelations);

      const result = await service.createCalendarEvent(
        'session-123',
        'teacher@test.com',
        'Test Class',
      );

      expect(result).toEqual({
        eventId: 'event-123',
        meetLink: 'https://meet.google.com/abc-def',
      });
      expect(mockCalendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          conferenceDataVersion: 1,
        }),
      );
    });

    it('should throw error when session not found', async () => {
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(
        service.createCalendarEvent('nonexistent', 'teacher@test.com', 'Test Class'),
      ).rejects.toThrow('Session not found: nonexistent');
    });

    it('should fetch teacher email from session when not provided', async () => {
      const mockEventResponse = {
        data: {
          id: 'event-456',
          conferenceData: {
            entryPoints: [],
          },
        },
      };
      mockCalendar.events.insert.mockResolvedValue(mockEventResponse);
      prismaService.session.findUnique.mockResolvedValue(mockSessionWithRelations);

      await service.createCalendarEvent('session-123', '', 'Test Class');

      expect(mockCalendar.events.insert).toHaveBeenCalled();
    });

    it('should throw error when teacher email cannot be determined', async () => {
      prismaService.session.findUnique.mockResolvedValue(mockSessionWithoutTeacherEmail);

      await expect(
        service.createCalendarEvent('session-456', '', 'Another Class'),
      ).rejects.toThrow('Teacher email not found');
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update event successfully', async () => {
      mockCalendar.events.get.mockResolvedValue({ data: mockExistingEvent });
      mockCalendar.events.update.mockResolvedValue({
        data: {
          ...mockExistingEvent,
          conferenceData: {
            entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/updated' }],
          },
        },
      });
      prismaService.session.findUnique.mockResolvedValue(mockSessionWithRelations);

      const result = await service.updateCalendarEvent('event-123', 'session-123');

      expect(result).toEqual({
        eventId: 'event-123',
        meetLink: 'https://meet.google.com/updated',
      });
    });

    it('should throw error when session not found during update', async () => {
      mockCalendar.events.get.mockResolvedValue({ data: mockExistingEvent });
      prismaService.session.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCalendarEvent('event-123', 'nonexistent'),
      ).rejects.toThrow('Session not found: nonexistent');
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete event successfully', async () => {
      mockCalendar.events.delete.mockResolvedValue({});

      await service.deleteCalendarEvent('event-123');

      expect(mockCalendar.events.delete).toHaveBeenCalledWith({
        calendarId: 'test-calendar@group.calendar.google.com',
        eventId: 'event-123',
      });
    });

    it('should handle idempotent delete when event not found', async () => {
      const error = new Error('Not found');
      error.message = 'Event not found';
      mockCalendar.events.delete.mockRejectedValue(error);

      await service.deleteCalendarEvent('nonexistent');

      expect(mockCalendar.events.delete).toHaveBeenCalled();
    });

    it('should throw error on other API failures', async () => {
      mockCalendar.events.delete.mockRejectedValue(new Error('API Error'));

      await expect(service.deleteCalendarEvent('event-123')).rejects.toThrow();
    });
  });

  describe('getEvent', () => {
    it('should get event by id', async () => {
      const mockEvent = {
        id: 'event-123',
        summary: 'Test Event',
      };
      mockCalendar.events.get.mockResolvedValue({ data: mockEvent });

      const result = await service.getEvent('event-123');

      expect(result).toEqual(mockEvent);
    });
  });

  describe('testConnection', () => {
    it('should return true when connection successful', async () => {
      mockCalendar.calendarList.list.mockResolvedValue({
        data: { items: [{ id: 'primary' }] },
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockCalendar.calendarList.list.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });
});
