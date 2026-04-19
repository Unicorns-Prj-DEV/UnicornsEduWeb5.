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

const CLASS_EVENT_PALETTES: CalendarEventPalette[] = [
  {
    start: "#0F766E",
    end: "#115E59",
    text: "#F8FAFC",
    shadow: "rgba(15, 118, 110, 0.26)",
    ring: "rgba(94, 234, 212, 0.82)",
    accent: "#99F6E4",
  },
  {
    start: "#2563EB",
    end: "#1D4ED8",
    text: "#F8FAFC",
    shadow: "rgba(37, 99, 235, 0.28)",
    ring: "rgba(147, 197, 253, 0.84)",
    accent: "#BFDBFE",
  },
  {
    start: "#7C3AED",
    end: "#6D28D9",
    text: "#F8FAFC",
    shadow: "rgba(124, 58, 237, 0.26)",
    ring: "rgba(196, 181, 253, 0.82)",
    accent: "#DDD6FE",
  },
  {
    start: "#DB2777",
    end: "#BE185D",
    text: "#FFF1F2",
    shadow: "rgba(219, 39, 119, 0.24)",
    ring: "rgba(251, 207, 232, 0.86)",
    accent: "#FBCFE8",
  },
  {
    start: "#EA580C",
    end: "#C2410C",
    text: "#FFF7ED",
    shadow: "rgba(234, 88, 12, 0.24)",
    ring: "rgba(254, 215, 170, 0.84)",
    accent: "#FED7AA",
  },
  {
    start: "#4D7C0F",
    end: "#3F6212",
    text: "#F7FEE7",
    shadow: "rgba(77, 124, 15, 0.24)",
    ring: "rgba(190, 242, 100, 0.82)",
    accent: "#D9F99D",
  },
  {
    start: "#4338CA",
    end: "#3730A3",
    text: "#EEF2FF",
    shadow: "rgba(67, 56, 202, 0.26)",
    ring: "rgba(199, 210, 254, 0.84)",
    accent: "#C7D2FE",
  },
  {
    start: "#0891B2",
    end: "#0E7490",
    text: "#ECFEFF",
    shadow: "rgba(8, 145, 178, 0.24)",
    ring: "rgba(165, 243, 252, 0.82)",
    accent: "#A5F3FC",
  },
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

const MAKEUP_EVENT_PALETTE: CalendarEventPalette = {
  start: "#C2410C",
  end: "#EA580C",
  text: "#FFF7ED",
  shadow: "rgba(194, 65, 12, 0.26)",
  ring: "rgba(254, 215, 170, 0.88)",
  accent: "#FED7AA",
};

const EXAM_EVENT_PALETTE: CalendarEventPalette = {
  start: "#BE123C",
  end: "#E11D48",
  text: "#FFF1F2",
  shadow: "rgba(225, 29, 72, 0.24)",
  ring: "rgba(251, 207, 232, 0.88)",
  accent: "#FBCFE8",
};

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
