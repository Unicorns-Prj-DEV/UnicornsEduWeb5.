import type { ClassStatus, ClassType } from "@/dtos/class.dto";

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function normalizePage(rawPage: string | null): number {
  const parsed = Number(rawPage);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function normalizeClassStatus(rawStatus: string | null): "" | ClassStatus {
  return rawStatus === "running" || rawStatus === "ended" ? rawStatus : "";
}

export function normalizeClassType(rawType: string | null): "" | ClassType {
  return rawType === "basic" || rawType === "vip" || rawType === "advance" || rawType === "hardcore"
    ? rawType
    : "";
}

function padTimeSegment(value: number): string {
  return String(value).padStart(2, "0");
}

export function normalizeTimeOnly(raw?: string | null): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  const matched = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (matched) {
    const [, hours, minutes, seconds = "00"] = matched;
    return `${hours}:${minutes}:${seconds}`;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "";

  return `${padTimeSegment(date.getHours())}:${padTimeSegment(date.getMinutes())}:${padTimeSegment(date.getSeconds())}`;
}
