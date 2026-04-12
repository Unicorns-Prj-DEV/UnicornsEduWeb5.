export interface GoogleCalendarEventAttendee {
  email: string;
  displayName?: string;
  role?: 'CO_HOST' | 'ATTENDEE';
}

/**
 * Represents a schedule entry for Google Calendar event creation
 */
export interface ScheduleEntryEventData {
  classId: string;
  className: string;
  entryId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // HH:mm or HH:mm:ss
  endTime: string; // HH:mm or HH:mm:ss
  teacherEmail?: string;
  teacherName?: string;
  timeZone?: string;
}

export interface GoogleCalendarEventData {
  summary: string;
  description?: string;
  startDateTimeStr: string;
  endDateTimeStr: string;
  timeZone?: string;
  attendees?: GoogleCalendarEventAttendee[];
}

export interface CreateCalendarEventResult {
  eventId: string;
  meetLink: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
  conferenceData?: {
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  recurrence?: string[];
  htmlLink: string;
}

export interface GoogleCalendarConfig {
  serviceAccountKeyBase64?: string;
  serviceAccountJsonPath?: string;
  calendarId?: string;
  timeZone?: string;
  // OAuth2 user credentials (preferred for Google Meet support)
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
}
