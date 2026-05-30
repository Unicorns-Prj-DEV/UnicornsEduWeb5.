import type { ClassScheduleEvent } from "@/dtos/class-schedule.dto";

const VIETNAM_TIMEZONE_OFFSET_MINUTES = 7 * 60;

function parseVietnamEventTime(date: string, time?: string) {
  if (!time) return null;
  const [hours, minutes, seconds = "0"] = time.split(":");

  const timestamp = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(hours),
    Number(minutes) - VIETNAM_TIMEZONE_OFFSET_MINUTES,
    Number(seconds),
  );

  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function isRandomCheckEligibleEvent(
  event: ClassScheduleEvent,
  now: Date,
) {
  if (event.eventType === "exam") return false;
  if (!event.meetLink?.trim()) return false;

  const start = parseVietnamEventTime(event.date, event.startTime);
  const end = parseVietnamEventTime(event.date, event.endTime);
  if (!start || !end) return false;

  return start <= now && now <= end;
}

export function selectRandomCheckEvent(
  events: ClassScheduleEvent[],
  now = new Date(),
  random: () => number = Math.random,
) {
  const eligibleEvents = events.filter((event) =>
    isRandomCheckEligibleEvent(event, now),
  );

  if (eligibleEvents.length === 0) return null;

  const index = Math.min(
    eligibleEvents.length - 1,
    Math.floor(random() * eligibleEvents.length),
  );
  return eligibleEvents[index] ?? null;
}
