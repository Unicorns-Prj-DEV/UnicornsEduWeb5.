export const TIME_MINUTE_STEP = 15;
export const TIME_MINUTE_OPTIONS = [0, 15, 30, 45] as const;

export type ParsedTime = {
  hours: number;
  minutes: number;
  seconds: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatTimeValue(
  hours: number,
  minutes: number,
  seconds = 0,
): string {
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatTimeDisplay(hours: number, minutes: number): string {
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function parseTimeValue(raw?: string | null): ParsedTime | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const matched = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!matched) return null;

  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  const seconds = Number(matched[3] ?? "0");
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  return { hours, minutes, seconds };
}

/** Normalize typed input to HH:mm:ss; seconds always 00. Accepts HHmm, H:mm, HH:mm, HH:mm:ss. */
export function normalizeTypedTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (/^\d{3,4}$/.test(digitsOnly) && !trimmed.includes(":")) {
    const padded = digitsOnly.padStart(4, "0");
    const hours = Number(padded.slice(0, 2));
    const minutes = Number(padded.slice(2, 4));
    if (hours > 23 || minutes > 59) return null;
    return formatTimeValue(hours, minutes, 0);
  }

  const matched = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!matched) return null;

  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    return null;
  }

  return formatTimeValue(hours, minutes, 0);
}

export function toTimeDisplay(raw?: string | null): string {
  const parsed = parseTimeValue(raw);
  if (!parsed) return "";
  return formatTimeDisplay(parsed.hours, parsed.minutes);
}

export function currentHourPrefillValue(now = new Date()): string {
  return formatTimeValue(now.getHours(), 0, 0);
}

export function isMinuteOnPickerGrid(minutes: number): boolean {
  return TIME_MINUTE_OPTIONS.includes(
    minutes as (typeof TIME_MINUTE_OPTIONS)[number],
  );
}
