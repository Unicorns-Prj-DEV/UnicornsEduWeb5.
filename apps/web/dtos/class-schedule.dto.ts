/**
 * Class Schedule DTOs
 * Used for class-based calendar view and management
 */

/**
 * Represents a weekly schedule pattern entry for a class
 */
export interface ClassScheduleEntry {
  id?: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  from: string; // HH:mm:ss format
  to: string; // HH:mm:ss format
  teacherId?: string; // Responsible tutor for this recurring slot
  googleCalendarEventId?: string; // Google Calendar recurring event ID
  meetLink?: string; // Google Meet link for this recurring schedule
}

/**
 * Represents a specific class session occurrence in the calendar
 */
export interface ClassScheduleEvent {
  occurrenceId: string; // Unique ID for this occurrence
  classId: string;
  className: string;
  teacherIds: string[];
  teacherNames: string[];
  date: string; // YYYY-MM-DD format
  startTime?: string; // HH:mm:ss format (optional if full day)
  endTime?: string; // HH:mm:ss format
  patternEntryId?: string; // Reference to the ClassScheduleEntry that generated this
  meetLink?: string; // Google Meet link from the corresponding session/schedule
}

/**
 * Filters for class schedule view
 */
export interface ClassScheduleFilter {
  classId?: string;
  teacherId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}
