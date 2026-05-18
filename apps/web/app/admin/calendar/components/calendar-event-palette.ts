"use client";

import { ClassScheduleEvent } from "@/dtos/class-schedule.dto";

export type CalendarEventPalette = {
  start: string;
  end: string;
  text: string;
  shadow: string;
  ring: string;
  accent: string;
};

const themeColor = (token: string) => `var(--ue-${token})`;
const mix = (token: string, amount: number, base = "transparent") =>
  `color-mix(in srgb, ${themeColor(token)} ${amount}%, ${base})`;
const calendarPalette = (
  token: string,
  accentToken = token,
): CalendarEventPalette => ({
  start: mix(token, 92, themeColor("bg-surface")),
  end: mix(token, 82, themeColor("text-primary")),
  text: themeColor("text-inverse"),
  shadow: mix(token, 28),
  ring: mix(accentToken, 72),
  accent: mix(accentToken, 38, themeColor("bg-surface")),
});

const CLASS_EVENT_PALETTES: CalendarEventPalette[] = [
  calendarPalette("primary", "border-focus"),
  calendarPalette("info"),
  calendarPalette("success"),
  calendarPalette("warning"),
  calendarPalette("error"),
  calendarPalette("danger"),
  calendarPalette("secondary", "primary"),
  calendarPalette("text-secondary", "info"),
];

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

export const getClassEventPalette = (classId: string) =>
  CLASS_EVENT_PALETTES[hashString(classId) % CLASS_EVENT_PALETTES.length];

const MAKEUP_EVENT_PALETTE: CalendarEventPalette = calendarPalette("warning");

const EXAM_EVENT_PALETTE: CalendarEventPalette = calendarPalette("error");

export const getCalendarEventPalette = (
  event: Pick<ClassScheduleEvent, "eventType" | "classId">,
) => {
  if (event.eventType === "makeup") {
    return MAKEUP_EVENT_PALETTE;
  }

  if (event.eventType === "exam") {
    return EXAM_EVENT_PALETTE;
  }

  return getClassEventPalette(event.classId);
};

export const getCalendarEventTypeLabel = (
  eventType: ClassScheduleEvent["eventType"],
) => {
  switch (eventType) {
    case "makeup":
      return "Buổi bù";
    case "exam":
      return "Lịch thi";
    default:
      return "Lịch cố định";
  }
};
