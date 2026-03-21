"use client";

import type {
  LessonOutputStatus,
  LessonTaskPriority,
  LessonTaskStatus,
} from "@/dtos/lesson.dto";
import { ROLE_LABELS } from "@/lib/staff.constants";

export const LESSON_TASK_STATUS_LABELS: Record<LessonTaskStatus, string> = {
  pending: "Chưa bắt đầu",
  in_progress: "Đang làm",
  completed: "Hoàn thành",
  cancelled: "Hủy",
};

export const LESSON_TASK_PRIORITY_LABELS: Record<LessonTaskPriority, string> = {
  low: "Thấp",
  medium: "Vừa",
  high: "Cao",
};

export const LESSON_OUTPUT_STATUS_LABELS: Record<LessonOutputStatus, string> = {
  pending: "Chưa xong",
  completed: "Hoàn thành",
  cancelled: "Hủy",
};

export function formatLessonDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatLessonDateOnly(value: string | null | undefined) {
  if (!value) return "Chưa đặt";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

export function lessonTaskStatusChipClass(status: LessonTaskStatus) {
  if (status === "completed")
    return "bg-success/15 text-success ring-success/25";
  if (status === "in_progress") return "bg-info/15 text-info ring-info/25";
  if (status === "cancelled") return "bg-error/15 text-error ring-error/25";
  return "bg-warning/15 text-warning ring-warning/25";
}

export function lessonTaskPriorityChipClass(priority: LessonTaskPriority) {
  if (priority === "high") return "bg-error/12 text-error ring-error/20";
  if (priority === "medium")
    return "bg-primary/12 text-primary ring-primary/20";
  return "bg-bg-secondary text-text-secondary ring-border-default";
}

export function lessonOutputStatusChipClass(status: LessonOutputStatus) {
  if (status === "completed")
    return "bg-success/15 text-success ring-success/25";
  if (status === "cancelled") return "bg-error/15 text-error ring-error/25";
  return "bg-warning/15 text-warning ring-warning/25";
}

export function formatLessonStaffRoleLabel(roles: string[]) {
  if (roles.length === 0) {
    return "Chưa có vai trò";
  }

  return roles
    .slice(0, 2)
    .map((role) => ROLE_LABELS[role] ?? role)
    .join(" · ");
}

export function formatLessonStaffStatusLabel(status: "active" | "inactive") {
  return status === "active" ? "Hoạt động" : "Ngừng";
}
