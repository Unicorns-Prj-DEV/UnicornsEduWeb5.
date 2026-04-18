import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { GoogleCalendarService as GoogleCalendarServiceType } from './google-calendar.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

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

const mockJWT = {
  authorize: jest.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    tokenType: 'Bearer',
  }),
};

const mockServiceAccountKey = Buffer.from(
  JSON.stringify({
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'test-private-key-id',
    private_key: '-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----\n',
    client_email: 'calendar-bot@test-project.iam.gserviceaccount.com',
    client_id: '1234567890',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url:
      'https://www.googleapis.com/robot/v1/metadata/x509/calendar-bot%40test-project.iam.gserviceaccount.com',
  }),
).toString('base64');

jest.mock('googleapis', () => ({
  google: mockGoogle,
}));

jest.mock('google-auth-library', () => ({
  JWT: jest.fn(() => mockJWT),
}));

const { GoogleCalendarService } = require('./google-calendar.service') as {
  GoogleCalendarService: typeof GoogleCalendarServiceType;
};

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarServiceType;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const env: Record<string, string> = {
                GOOGLE_SERVICE_ACCOUNT_KEY: mockServiceAccountKey,
                GOOGLE_CALENDAR_ID: 'test-calendar@group.calendar.google.com',
                GOOGLE_TIME_ZONE: 'Asia/Ho_Chi_Minh',
              };
              return env[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GoogleCalendarServiceType>(GoogleCalendarService);

    jest.clearAllMocks();
    mockGoogle.calendar.mockReturnValue(mockCalendar);
    mockJWT.authorize.mockResolvedValue({
      accessToken: 'mock-access-token',
      tokenType: 'Bearer',
    });

    (service as unknown as { calendar: typeof mockCalendar }).calendar =
      mockCalendar;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdateClassScheduleRecurringEvent', () => {
    it('creates a recurring event with Google Meet data for a class schedule entry', async () => {
      mockCalendar.events.insert.mockResolvedValue({
        data: {
          id: 'event-123',
          conferenceData: {
            entryPoints: [
              {
                entryPointType: 'video',
                uri: 'https://meet.google.com/abc-defg-hij',
              },
            ],
          },
        },
      });

      const result = await service.createOrUpdateClassScheduleRecurringEvent({
        classId: 'class-123',
        className: 'Math 10A',
        entryId: 'entry-1',
        teacherEmails: ['teacher@example.com'],
        dayOfWeek: 2,
        from: '19:00:00',
        end: '20:30:00',
      });

      expect(result).toEqual({
        eventId: 'event-123',
        meetLink: 'https://meet.google.com/abc-defg-hij',
      });
      expect(mockCalendar.events.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarId: 'test-calendar@group.calendar.google.com',
          conferenceDataVersion: 1,
          requestBody: expect.objectContaining({
            recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=TU'],
            attendees: [{ email: 'teacher@example.com', role: 'CO_HOST' }],
          }),
        }),
      );
    });

    it('updates an existing recurring event when calendarEventId is provided', async () => {
      mockCalendar.events.update.mockResolvedValue({
        data: {
          id: 'event-999',
          conferenceData: {
            entryPoints: [],
          },
        },
      });

      const result = await service.createOrUpdateClassScheduleRecurringEvent({
        classId: 'class-123',
        className: 'Math 10A',
        entryId: 'entry-1',
        calendarEventId: 'event-999',
        teacherEmails: ['teacher@example.com'],
        dayOfWeek: 4,
        from: '19:00:00',
        end: '20:30:00',
      });

      expect(result).toEqual({
        eventId: 'event-999',
        meetLink: undefined,
      });
      expect(mockCalendar.events.update).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'event-999',
          conferenceDataVersion: 1,
        }),
      );
    });

    it('reinitializes the client and retries once when Google returns an auth error', async () => {
      mockCalendar.events.insert
        .mockRejectedValueOnce(
          Object.assign(new Error('Request failed with status code 401'), {
            code: 401,
          }),
        )
        .mockResolvedValueOnce({
          data: {
            id: 'event-retried',
            conferenceData: {
              entryPoints: [],
            },
          },
        });

      const result = await service.createOrUpdateClassScheduleRecurringEvent({
        classId: 'class-123',
        className: 'Math 10A',
        entryId: 'entry-1',
        teacherEmails: ['teacher@example.com'],
        dayOfWeek: 2,
        from: '19:00:00',
        end: '20:30:00',
      });

      expect(result).toEqual({
        eventId: 'event-retried',
        meetLink: undefined,
      });
      expect(mockJWT.authorize).toHaveBeenCalledTimes(1);
      expect(mockGoogle.calendar).toHaveBeenCalledTimes(1);
      expect(mockCalendar.events.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteCalendarEvent', () => {
    it('deletes event successfully', async () => {
      mockCalendar.events.delete.mockResolvedValue({});

      await service.deleteCalendarEvent('event-123');

      expect(mockCalendar.events.delete).toHaveBeenCalledWith({
        calendarId: 'test-calendar@group.calendar.google.com',
        eventId: 'event-123',
      });
    });

    it('handles idempotent delete when event is not found', async () => {
      const error = new Error('Event not found');
      mockCalendar.events.delete.mockRejectedValue(error);

      await service.deleteCalendarEvent('missing-event');

      expect(mockCalendar.events.delete).toHaveBeenCalled();
    });

    it('throws on non-not-found delete errors', async () => {
      mockCalendar.events.delete.mockRejectedValue(new Error('API Error'));

      await expect(service.deleteCalendarEvent('event-123')).rejects.toThrow();
    });
  });

  describe('testConnection', () => {
    it('initializes the calendar with JWT auth so service-account tokens can auto-refresh', async () => {
      (
        service as unknown as { calendar: typeof mockCalendar | null }
      ).calendar = null;
      mockCalendar.calendarList.list.mockResolvedValue({
        data: { items: [{ id: 'primary' }] },
      });

      await expect(service.testConnection()).resolves.toBe(true);

      expect(mockJWT.authorize).toHaveBeenCalledTimes(1);
      expect(mockGoogle.calendar).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 'v3',
          auth: mockJWT,
        }),
      );
    });

    it('returns true when connection succeeds', async () => {
      mockCalendar.calendarList.list.mockResolvedValue({
        data: { items: [{ id: 'primary' }] },
      });

      await expect(service.testConnection()).resolves.toBe(true);
    });

    it('returns false when connection fails', async () => {
      mockCalendar.calendarList.list.mockRejectedValue(
        new Error('Connection failed'),
      );

      await expect(service.testConnection()).resolves.toBe(false);
    });
  });
});
