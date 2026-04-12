import { Injectable, Logger, OnModuleInit, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { JWT, OAuth2Client } from 'google-auth-library';
import { calendar_v3, google } from 'googleapis';

import {
  GoogleCalendarEventData,
  CreateCalendarEventResult,
  GoogleCalendarEvent,
  GoogleCalendarConfig,
} from './interfaces/google-calendar.interface';
import { NotFoundException } from '@nestjs/common';
import {
  CalendarEventFilterDto,
  CalendarEventResponseDto,
  ResyncResponseDto,
} from '../dtos/google-calendar.dto';
import { Prisma } from '../../generated/client';
import {
  GoogleCalendarAuthError,
  GoogleCalendarInvalidConfigurationError,
  GoogleCalendarApiError,
  GoogleCalendarEventNotFoundError,
} from './errors/google-calendar.errors';

interface ServiceAccountCredentials {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

type CalendarAuthClient = {
  accessToken: string;
  tokenType: string;
  keys: string[];
};

@Injectable({
  scope: Scope.DEFAULT,
})
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private calendar!: calendar_v3.Calendar;
  private config!: GoogleCalendarConfig;
  private readonly DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
  private readonly GOOGLE_CALENDAR_SCOPE =
    'https://www.googleapis.com/auth/calendar';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.config = this.loadConfig();
  }

  onModuleInit(): void {
    // Initialize calendar if configured, otherwise log warning
    this.initializeCalendar().catch((error) => {
      this.logger.error(
        `Failed to initialize Google Calendar on module init: ${error}`,
      );
    });
  }

  private loadConfig(): GoogleCalendarConfig {
    const serviceAccountKeyBase64 =
      this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY');
    const serviceAccountJsonPath =
      this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_JSON_PATH');
    const calendarId =
      this.configService.get<string>('GOOGLE_CALENDAR_ID');
    const timeZone =
      this.configService.get<string>('GOOGLE_TIME_ZONE') || this.DEFAULT_TIME_ZONE;

    // OAuth2 user credentials (preferred for Google Meet support)
    const googleClientId =
      this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const googleClientSecret =
      this.configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    const googleRefreshToken =
      this.configService.get<string>('GOOGLE_REFRESH_TOKEN');

    return {
      serviceAccountKeyBase64,
      serviceAccountJsonPath,
      calendarId,
      timeZone,
      googleClientId,
      googleClientSecret,
      googleRefreshToken,
    };
  }

  private async getServiceAccountCredentials(): Promise<ServiceAccountCredentials | null> {
    const { serviceAccountKeyBase64, serviceAccountJsonPath } = this.config;

    if (serviceAccountKeyBase64) {
      try {
        const json = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
        return JSON.parse(json) as ServiceAccountCredentials;
      } catch (error) {
        this.logger.error(
          `Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY base64: ${error}`,
        );
        return null;
      }
    }

    if (serviceAccountJsonPath) {
      try {
        const fs = await import('fs');
        const json = fs.readFileSync(serviceAccountJsonPath, 'utf-8');
        return JSON.parse(json) as ServiceAccountCredentials;
      } catch (error) {
        this.logger.error(
          `Failed to read GOOGLE_SERVICE_ACCOUNT_JSON_PATH: ${error}`,
        );
        return null;
      }
    }

    return null;
  }

  private async initializeCalendar(): Promise<void> {
    const { googleClientId, googleClientSecret, googleRefreshToken, serviceAccountKeyBase64, serviceAccountJsonPath } = this.config;

    this.logger.log(`[Calendar Startup] Initializing Google Calendar...`);
    this.logger.log(`[Calendar Startup] OAuth: clientId=${!!googleClientId}, clientSecret=${!!googleClientSecret}, refreshToken=${!!googleRefreshToken}`);
    this.logger.log(`[Calendar Startup] ServiceAccount: keyBase64=${!!serviceAccountKeyBase64}, jsonPath=${!!serviceAccountJsonPath}`);

    // Prefer OAuth2 user authentication (supports Google Meet)
    if (googleRefreshToken && googleClientId && googleClientSecret) {
      try {
        this.logger.log(`[Calendar Startup] Attempting OAuth2 authentication...`);
        const oauth2Client = new OAuth2Client(googleClientId, googleClientSecret);
        oauth2Client.setCredentials({ refresh_token: googleRefreshToken });

        // Force token refresh to verify credentials are valid
        const tokenInfo = await oauth2Client.getAccessToken();
        if (!tokenInfo.token) {
          throw new Error('Failed to obtain access token from refresh token');
        }

        this.logger.log(`[Calendar Startup] OAuth2 token obtained successfully`);

        this.calendar = google.calendar({
          version: 'v3',
          auth: oauth2Client,
        }) as calendar_v3.Calendar;

        this.logger.log(`[Calendar Startup] Google Calendar initialized via OAuth2 user credentials`);
        return;
      } catch (error) {
        this.logger.error(`[Calendar Startup] OAuth2 authentication failed: ${error}`);
        throw new GoogleCalendarAuthError(`OAuth2 authentication failed: ${error}`);
      }
    }

    this.logger.log(`[Calendar Startup] OAuth2 not configured, falling back to service account`);

    // Fallback to service account (no Meet support)
    if (serviceAccountKeyBase64 || serviceAccountJsonPath) {
      const credentials = await this.getServiceAccountCredentials();
      if (!credentials) {
        throw new GoogleCalendarInvalidConfigurationError(
          'Failed to load service account credentials',
        );
      }

      try {
        const auth = new JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: [this.GOOGLE_CALENDAR_SCOPE],
        });

        const authClient = await auth.authorize() as CalendarAuthClient;

        this.calendar = google.calendar({
          version: 'v3',
          auth: authClient.accessToken,
        }) as calendar_v3.Calendar;

        this.logger.log(`[Calendar Startup] Google Calendar initialized via service account (${credentials.client_email})`);
      } catch (error) {
        this.logger.error(`[Calendar Startup] Service account authorization failed: ${error}`);
        throw new GoogleCalendarAuthError(`Authentication failed: ${error}`);
      }
      return;
    }

    this.logger.warn(
      `[Calendar Startup] Google Calendar NOT configured: No OAuth2 credentials or service account found`,
    );
  }

  private checkCalendarInitialized(): void {
    if (!this.calendar) {
      throw new GoogleCalendarAuthError(
        'Google Calendar client not initialized. Check service account configuration.',
      );
    }
  }

  private buildEventData(
    session: {
      id: string;
      teacherId: string;
      classId: string;
      date: Date;
      startTime?: Date | null;
      endTime?: Date | null;
      notes?: string | null;
      teacher: {
        user?: { email?: string | null } | null;
      } | null;
    },
    teacherEmail: string,
    className: string,
  ): GoogleCalendarEventData {
    const timeZone = this.config.timeZone || this.DEFAULT_TIME_ZONE;

    // Format session date and time directly as strings (no Date manipulation)
    const sessionDate = new Date(session.date);
    const dateStr = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;

    let startDateTimeStr: string;
    let endDateTimeStr: string;

    if (session.startTime) {
      const startTime = new Date(session.startTime);
      startDateTimeStr = `${dateStr}T${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}:${String(startTime.getSeconds()).padStart(2, '0')}`;
    } else {
      startDateTimeStr = `${dateStr}T14:00:00`;
    }

    if (session.endTime) {
      const endTime = new Date(session.endTime);
      endDateTimeStr = `${dateStr}T${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:${String(endTime.getSeconds()).padStart(2, '0')}`;
    } else {
      const startParts = startDateTimeStr.split('T')[1].split(':').map(Number);
      const endHours = (startParts[0] ?? 14) + 2;
      endDateTimeStr = `${dateStr}T${String(endHours).padStart(2, '0')}:${String(startParts[1] ?? 0).padStart(2, '0')}:00`;
    }

    if (endDateTimeStr <= startDateTimeStr) {
      const startParts = startDateTimeStr.split('T')[1].split(':').map(Number);
      const endHours = (startParts[0] ?? 14) + 2;
      endDateTimeStr = `${dateStr}T${String(endHours).padStart(2, '0')}:${String(startParts[1] ?? 0).padStart(2, '0')}:00`;
    }

    const summary = `[Class] ${className} - Session ${session.id.slice(0, 8)}`;
    const description = this.buildEventDescription(session, className);

    return {
      summary,
      description,
      startDateTimeStr,
      endDateTimeStr,
      timeZone,
      attendees: [
        {
          email: teacherEmail,
          role: 'CO_HOST',
        },
      ],
    };
  }

  private buildEventDescription(
    session: {
      id: string;
      notes?: string | null;
      teacher: {
        user?: { email?: string | null } | null;
      } | null;
    },
    className: string,
  ): string {
    const lines = [
      `Class: ${className}`,
      `Session ID: ${session.id}`,
    ];

    if (session.teacher?.user?.email) {
      lines.push(`Teacher Email: ${session.teacher.user.email}`);
    }

    if (session.notes) {
      lines.push(`Notes: ${session.notes}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('This event was created automatically by the UnicornsEdu system.');

    return lines.join('\n');
  }

  async createCalendarEvent(
    sessionId: string,
    teacherEmail: string,
    className: string,
  ): Promise<CreateCalendarEventResult> {
    this.logger.log(`[Calendar CRUD:CREATE] createCalendarEvent: sessionId=${sessionId}, teacherEmail=${teacherEmail}, className=${className}`);
    this.checkCalendarInitialized();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teacher: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        class: {
          select: { name: true },
        },
      },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const effectiveTeacherEmail =
      teacherEmail || session.teacher.user?.email;
    if (!effectiveTeacherEmail) {
      throw new Error(
        `Teacher email not found for session ${sessionId}. Please provide teacherEmail parameter.`,
      );
    }

    const eventData = this.buildEventData(
      session,
      effectiveTeacherEmail,
      className || session.class.name,
    );
    this.logger.log(`[Calendar CRUD:CREATE] Event data: summary=${eventData.summary}, start=${eventData.startDateTimeStr}, end=${eventData.endDateTimeStr}`);

    const requestId = uuidv4();
    this.logger.log(`[Calendar CRUD:CREATE] conferenceData.createRequest requestId=${requestId}`);

    try {
      const response = await this.calendar.events.insert({
        calendarId: this.config.calendarId || 'primary',
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.startDateTimeStr,
            timeZone: eventData.timeZone,
          },
          end: {
            dateTime: eventData.endDateTimeStr,
            timeZone: eventData.timeZone,
          },
          attendees: eventData.attendees,
          conferenceData: {
            createRequest: {
              requestId,
            },
          },
        },
        conferenceDataVersion: 1,
      });

      const event = response.data as GoogleCalendarEvent;
      const meetLink = event.conferenceData?.entryPoints.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri || '';

      this.logger.log(`[Calendar CRUD:CREATE] API response: eventId=${event.id}, conferenceData=${!!event.conferenceData}, meetLink=${meetLink || '(none)'}`);
      this.logger.log(`[Calendar CRUD:CREATE] Created Google Calendar event: ${event.id} for session ${sessionId}`);

      return {
        eventId: event.id,
        meetLink: meetLink,
      };
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`[Calendar CRUD:CREATE] Failed to create event for session ${sessionId}: ${stack}`);
      this.handleApiError(error, 'Failed to create calendar event');
      throw new GoogleCalendarApiError(
        `Failed to create calendar event for session ${sessionId}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }

  async updateCalendarEvent(
    eventId: string,
    sessionId: string,
  ): Promise<CreateCalendarEventResult> {
    this.logger.log(`[Calendar CRUD:UPDATE] updateCalendarEvent: eventId=${eventId}, sessionId=${sessionId}`);
    this.checkCalendarInitialized();

    const existingEvent = await this.getEvent(eventId);

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teacher: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        class: {
          select: { name: true },
        },
      },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const teacherEmail = session.teacher.user?.email;
    if (!teacherEmail) {
      throw new Error(`Teacher email not found for session ${sessionId}`);
    }

    const eventData = this.buildEventData(
      session,
      teacherEmail,
      session.class.name,
    );
    this.logger.log(`[Calendar CRUD:UPDATE] Updating event: summary=${eventData.summary}, start=${eventData.startDateTimeStr}, end=${eventData.endDateTimeStr}`);

    try {
      const response = await this.calendar.events.update({
        calendarId: this.config.calendarId || 'primary',
        eventId,
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.startDateTimeStr,
            timeZone: eventData.timeZone,
          },
          end: {
            dateTime: eventData.endDateTimeStr,
            timeZone: eventData.timeZone,
          },
          attendees:
            existingEvent.attendees && existingEvent.attendees.length > 0
              ? existingEvent.attendees
              : eventData.attendees,
        },
        conferenceDataVersion: 1,
      });

      const event = response.data as GoogleCalendarEvent;
      const meetLink = event.conferenceData?.entryPoints.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri || '';

      this.logger.log(`[Calendar CRUD:UPDATE] API response: eventId=${event.id}, conferenceData=${!!event.conferenceData}, meetLink=${meetLink || '(none)'}`);
      this.logger.log(`[Calendar CRUD:UPDATE] Updated Google Calendar event: ${eventId} for session ${sessionId}`);

      return {
        eventId: event.id,
        meetLink: meetLink,
      };
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`[Calendar CRUD:UPDATE] Failed to update event ${eventId} for session ${sessionId}: ${stack}`);
      this.handleApiError(error, 'Failed to update calendar event');
      throw new GoogleCalendarApiError(
        `Failed to update calendar event ${eventId}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }

  async resyncSessionCalendar(sessionId: string): Promise<void> {
    // Check if any calendar credentials are configured (OAuth2 or service account)
    const hasOAuth2 = !!(this.config.googleRefreshToken && this.config.googleClientId && this.config.googleClientSecret);
    const hasServiceAccount = !!(this.config.serviceAccountKeyBase64 || this.config.serviceAccountJsonPath);

    if (!hasOAuth2 && !hasServiceAccount) {
      this.logger.log(`[Calendar] resyncSessionCalendar(${sessionId}): No Google Calendar credentials configured, skipping`);
      return;
    }

    this.logger.log(`[Calendar] resyncSessionCalendar(${sessionId}): Starting calendar sync, auth method: ${hasOAuth2 ? 'OAuth2' : 'Service Account'}`);

    this.checkCalendarInitialized();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { googleCalendarEventId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    try {
      if (session.googleCalendarEventId) {
        this.logger.log(`[Calendar] resyncSessionCalendar(${sessionId}): Updating existing event ${session.googleCalendarEventId}`);
        const result = await this.updateCalendarEvent(
          session.googleCalendarEventId,
          sessionId,
        );
        this.logger.log(`[Calendar] resyncSessionCalendar(${sessionId}): Updated event, meetLink=${result.meetLink || '(none)'}`);
        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            googleMeetLink: result.meetLink || null,
            calendarSyncedAt: new Date(),
            calendarSyncError: null,
          },
        });
        return;
      }

      this.logger.log(`[Calendar] resyncSessionCalendar(${sessionId}): Creating new calendar event`);
      const result = await this.createCalendarEvent(sessionId, '', '');
      this.logger.log(`[Calendar] resyncSessionCalendar(${sessionId}): Created event ${result.eventId}, meetLink=${result.meetLink || '(none)'}`);
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          googleCalendarEventId: result.eventId,
          googleMeetLink: result.meetLink || null,
          calendarSyncedAt: new Date(),
          calendarSyncError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Calendar] resyncSessionCalendar(${sessionId}): Error: ${message}`);
      await this.prisma.session
        .update({
          where: { id: sessionId },
          data: { calendarSyncError: message },
        })
        .catch(() => undefined);
      throw err;
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    this.logger.log(`[Calendar CRUD:DELETE] Deleting Google Calendar event: eventId=${eventId}`);
    this.checkCalendarInitialized();

    try {
      await this.calendar.events.delete({
        calendarId: this.config.calendarId || 'primary',
        eventId,
      });

      this.logger.log(`[Calendar CRUD:DELETE] Successfully deleted event ${eventId}`);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message?.includes('not found')
      ) {
        this.logger.warn(`[Calendar CRUD:DELETE] Event ${eventId} not found during delete, treating as success`);
        return;
      }

      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`[Calendar CRUD:DELETE] Failed to delete event ${eventId}: ${stack}`);
      this.handleApiError(error, 'Failed to delete calendar event');
      throw new GoogleCalendarApiError(
        `Failed to delete calendar event ${eventId}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }

  async getEvent(eventId: string): Promise<GoogleCalendarEvent> {
    this.logger.log(`[Calendar CRUD:GET] getEvent: eventId=${eventId}`);
    this.checkCalendarInitialized();

    try {
      const response = await this.calendar.events.get({
        calendarId: this.config.calendarId || 'primary',
        eventId,
      });

      this.logger.log(`[Calendar CRUD:GET] Got event ${eventId}: summary=${response.data.summary || '(none)'}, conferenceData=${!!response.data.conferenceData}`);
      return response.data as GoogleCalendarEvent;
    } catch (error) {
      this.handleApiError(error, 'Failed to get calendar event');
      throw new GoogleCalendarEventNotFoundError(eventId);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.checkCalendarInitialized();

      const response = await this.calendar.calendarList.list({
        maxResults: 1,
      });

      this.logger.log(
        `Google Calendar connection test successful. Found ${response.data.items?.length || 0} calendars`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Google Calendar connection test failed: ${error}`);
      return false;
    }
  }

  private handleApiError(error: unknown, context: string): void {
    const err = error as Error & { errors?: unknown[]; code?: string };

    this.logger.error(`${context}:`, {
      message: err.message,
      code: err.code,
      errors: err.errors,
    });

    if (err.message?.includes('invalid_grant') || err.message?.includes('401')) {
      throw new GoogleCalendarAuthError(`Authentication error: ${err.message}`);
    }
  }

  async createOrUpdateClassScheduleRecurringEvent(params: {
    classId: string;
    className: string;
    entryId?: string;
    calendarEventId?: string;
    teacherEmails: string[];
    dayOfWeek: number;
    from: string;
    end: string;
  }): Promise<{ eventId: string; meetLink?: string }> {
    this.checkCalendarInitialized();

    const {
      classId,
      className,
      entryId,
      calendarEventId,
      teacherEmails,
      dayOfWeek,
      from,
      end,
    } = params;

    this.logger.log(`[Calendar] Creating recurring event for class "${className}" (${classId}), entry ${entryId}`);
    this.logger.log(`[Calendar] dayOfWeek=${dayOfWeek}, from=${from}, end=${end}, teacherEmails=${JSON.stringify(teacherEmails)}`);
    this.logger.log(`[Calendar] calendarId=${this.config.calendarId || 'primary'}, calendarEventId=${calendarEventId || 'new'}`);

    const dayMap: Record<number, string> = {
      0: 'SU',
      1: 'MO',
      2: 'TU',
      3: 'WE',
      4: 'TH',
      5: 'FR',
      6: 'SA',
    };
    const byday = dayMap[dayOfWeek];
    if (!byday) {
      throw new Error(`Invalid dayOfWeek: ${dayOfWeek}`);
    }

    // Calculate first occurrence date (next date matching dayOfWeek)
    const vnTimeZone = this.config.timeZone || this.DEFAULT_TIME_ZONE;
    const nowInVN = new Date(new Date().toLocaleString('en-US', { timeZone: vnTimeZone }));
    const today = new Date(nowInVN);
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();
    const diff = (dayOfWeek - currentDay + 7) % 7;
    const firstOccurrence = new Date(today);
    firstOccurrence.setDate(today.getDate() + diff);

    // Format date string directly (no Date manipulation — exact time from schedule)
    const dateStr = `${firstOccurrence.getFullYear()}-${String(firstOccurrence.getMonth() + 1).padStart(2, '0')}-${String(firstOccurrence.getDate()).padStart(2, '0')}`;
    const startDateTimeStr = `${dateStr}T${from}`;
    const endDateTimeStr = `${dateStr}T${end}`;

    this.logger.log(`[Calendar] First occurrence (VN): ${dateStr}, time: ${from}-${end}, dateTime: ${startDateTimeStr}`);

    // Validate time range by comparing the time strings directly
    if (end <= from) {
      throw new Error(
        `Invalid time range for class ${classId}: ${from} - ${end}`,
      );
    }

    const normalizedTeacherEmails = Array.from(
      new Set(
        teacherEmails
          .map((email) => email.trim())
          .filter((email) => email.length > 0),
      ),
    );
    const summary = `[Class] ${className} - Weekly`;
    const descriptionLines = [
      `Class: ${className}`,
      `Class ID: ${classId}`,
      entryId ? `Schedule Entry ID: ${entryId}` : null,
      `Schedule: Weekly on ${byday}`,
      `Time: ${from} - ${end}`,
      normalizedTeacherEmails.length > 0
        ? `Teachers: ${normalizedTeacherEmails.join(', ')}`
        : null,
      '',
      'This event was created automatically by the UnicornsEdu system.',
    ].filter((line): line is string => Boolean(line));
    const description = descriptionLines.join('\n');
    const existingEventId = calendarEventId;

    const eventBody: calendar_v3.Schema$Event = {
      summary,
      description,
      start: {
        dateTime: startDateTimeStr,
        timeZone: this.config.timeZone || this.DEFAULT_TIME_ZONE,
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone: this.config.timeZone || this.DEFAULT_TIME_ZONE,
      },
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${byday}`],
      attendees: normalizedTeacherEmails.map((email) => ({
        email,
        role: 'CO_HOST' as const,
      })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
        },
      },
    };

    this.logger.log(`[Calendar] Event body summary: ${summary}`);
    this.logger.log(`[Calendar] conferenceData.createRequest present: true`);
    this.logger.log(`[Calendar] Conference data version will be set to 1`);

    try {
      let response;
      const action = existingEventId ? 'update' : 'create';
      this.logger.log(`[Calendar] ${action === 'update' ? 'Updating' : 'Creating'} recurring event on Google Calendar...`);

      if (existingEventId) {
        response = await this.calendar.events.update({
          calendarId: this.config.calendarId || 'primary',
          eventId: existingEventId,
          requestBody: eventBody,
          conferenceDataVersion: 1,
        });
      } else {
        response = await this.calendar.events.insert({
          calendarId: this.config.calendarId || 'primary',
          requestBody: eventBody,
          conferenceDataVersion: 1,
        });
      }

      const event = response.data as GoogleCalendarEvent;
      this.logger.log(`[Calendar] Google API response event.id: ${event.id}`);
      this.logger.log(`[Calendar] conferenceData present: ${!!event.conferenceData}`);
      this.logger.log(`[Calendar] conferenceData raw: ${JSON.stringify(event.conferenceData, null, 2)}`);

      if (!event.id) {
        this.logger.error(`[Calendar] Google Calendar did not return an event id for class ${className}`);
        throw new GoogleCalendarApiError(
          `Google Calendar did not return an event id for class ${className}`,
        );
      }
      const meetLink =
        event.conferenceData?.entryPoints.find(
          (ep) => ep.entryPointType === 'video',
        )?.uri || '';

      if (meetLink) {
        this.logger.log(`[Calendar] Meet link created: ${meetLink}`);
      } else {
        this.logger.warn(`[Calendar] WARNING: No Meet link in response for class ${className}. This may indicate OAuth2 user credentials are not configured or conferenceData.createRequest was not processed.`);
      }

      this.logger.log(`[Calendar] ${action === 'update' ? 'Updated' : 'Created'} Google Calendar recurring event: ${event.id} for class ${className}, meetLink=${meetLink || '(none)'}`);

      return { eventId: event.id, meetLink: meetLink || undefined };
    } catch (error) {
      this.logger.error(`[Calendar] Error creating/updating recurring event:`, error);
      this.handleApiError(
        error,
        'Failed to create/update class schedule recurring event',
      );
      throw new GoogleCalendarApiError(
        `Failed to create/update class schedule recurring event for class ${className}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }
}
