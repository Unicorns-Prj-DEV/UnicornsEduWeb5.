"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail, ClassScheduleItem } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import { normalizeTimeOnly } from "@/lib/class.helpers";
import {
  classEditorModalBodyClassName,
  classEditorModalClassName,
  classEditorModalCloseButtonClassName,
  classEditorModalFooterClassName,
  classEditorModalHeaderClassName,
  classEditorModalPrimaryButtonClassName,
  classEditorModalSecondaryButtonClassName,
  classEditorModalTitleClassName,
} from "./classEditorModalStyles";

type ScheduleRangeForm = {
  id: string;
  from: string;
  to: string;
};

const EMPTY_SCHEDULE_RANGE = { from: "", to: "" } as const;

type Props = {
  open: boolean;
  onClose: () => void;
  classDetail: ClassDetail;
  onSubmitSchedule?: (data: { schedule: ClassScheduleItem[] }) => Promise<unknown>;
  onScheduleSaved?: () => Promise<unknown> | void;
};

function createScheduleRange(range?: Partial<Pick<ScheduleRangeForm, "from" | "to">>): ScheduleRangeForm {
  return {
    id: crypto.randomUUID(),
    from: range?.from ?? EMPTY_SCHEDULE_RANGE.from,
    to: range?.to ?? EMPTY_SCHEDULE_RANGE.to,
  };
}

function normalizeSchedule(schedule: unknown): ScheduleRangeForm[] {
  if (!Array.isArray(schedule)) return [];
  return schedule.reduce<ScheduleRangeForm[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const record = item as Record<string, unknown>;
    const from = normalizeTimeOnly(typeof record.from === "string" ? record.from : "");
    const to = normalizeTimeOnly(typeof record.to === "string" ? record.to : "");
    if (!from && !to) return acc;
    return [...acc, createScheduleRange({ from, to })];
  }, []);
}

function parseTimeToSeconds(value: string): number | null {
  const matched = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!matched) return null;
  const [, hoursRaw, minutesRaw, secondsRaw] = matched;
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const seconds = Number(secondsRaw);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function buildSchedulePayload(scheduleRanges: ScheduleRangeForm[]): ClassScheduleItem[] {
  return scheduleRanges.reduce<ClassScheduleItem[]>((acc, range) => {
    if (!range.from && !range.to) return acc;
    if ((range.from && !range.to) || (!range.from && range.to)) {
      throw new Error("Mỗi dòng lịch học cần đủ cả thời gian bắt đầu và kết thúc.");
    }
    const from = normalizeTimeOnly(range.from);
    const to = normalizeTimeOnly(range.to);
    const fromSeconds = parseTimeToSeconds(from);
    const toSeconds = parseTimeToSeconds(to);
    if (!from || !to || fromSeconds == null || toSeconds == null) {
      throw new Error("Khung giờ học phải dùng định dạng HH:mm:ss.");
    }
    if (fromSeconds >= toSeconds) {
      throw new Error("Thời gian lịch học không hợp lệ (bắt đầu phải nhỏ hơn kết thúc).");
    }
    return [...acc, { from, to }];
  }, []);
}

export default function EditClassSchedulePopup({
  open,
  onClose,
  classDetail,
  onSubmitSchedule,
  onScheduleSaved,
}: Props) {
  if (!open) return null;

  return (
    <EditClassScheduleDialog
      onClose={onClose}
      classDetail={classDetail}
      onSubmitSchedule={onSubmitSchedule}
      onScheduleSaved={onScheduleSaved}
    />
  );
}

function EditClassScheduleDialog({
  onClose,
  classDetail,
  onSubmitSchedule,
  onScheduleSaved,
}: Omit<Props, "open">) {
  const queryClient = useQueryClient();
  const [scheduleRanges, setScheduleRanges] = useState<ScheduleRangeForm[]>(() => {
    const normalized = normalizeSchedule(classDetail.schedule);
    return normalized.length > 0 ? normalized : [createScheduleRange()];
  });

  const updateMutation = useMutation({
    mutationFn: (data: { schedule: ClassScheduleItem[] }) =>
      onSubmitSchedule
        ? onSubmitSchedule(data)
        : classApi.updateClassSchedule(classDetail.id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["class", "detail", classDetail.id] }),
        queryClient.invalidateQueries({ queryKey: ["class", "list"] }),
        Promise.resolve(onScheduleSaved?.()),
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật lịch học.";
      toast.error(msg);
    },
  });

  const handleSubmit = async () => {
    let schedulePayload: ClassScheduleItem[];
    try {
      schedulePayload = buildSchedulePayload(scheduleRanges);
    } catch (error) {
      toast.error((error as Error).message || "Không thể lưu lịch học.");
      return;
    }
    try {
      await updateMutation.mutateAsync({ schedule: schedulePayload });
      toast.success("Đã lưu khung giờ học.");
      onClose();
    } catch {
      // handled in onError
    }
  };

  const handleAddRange = () => {
    setScheduleRanges((prev) => [...prev, createScheduleRange()]);
  };

  const handleRemoveRange = (id: string) => {
    setScheduleRanges((prev) => {
      if (prev.length === 1) return [createScheduleRange()];
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleChangeRange = (
    id: string,
    field: keyof Pick<ScheduleRangeForm, "from" | "to">,
    value: string,
  ) => {
    const normalizedValue = normalizeTimeOnly(value);
    setScheduleRanges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: normalizedValue } : item)),
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-schedule-title"
        className={`${classEditorModalClassName} overscroll-contain`}
      >
        <div className={classEditorModalHeaderClassName}>
          <h2 id="edit-class-schedule-title" className={classEditorModalTitleClassName}>
            Chỉnh sửa khung giờ học
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={classEditorModalCloseButtonClassName}
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`${classEditorModalBodyClassName} pr-0 sm:pr-1`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-muted">Định dạng HH:mm:ss.</p>
            <button
              type="button"
              onClick={handleAddRange}
              className="min-h-11 w-full rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:w-auto"
            >
              + Thêm khung giờ
            </button>
          </div>
          <div className="space-y-3">
            {scheduleRanges.map((range, index) => (
              <div
                key={range.id}
                className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:p-4"
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Khung {String(index + 1).padStart(2, "0")}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveRange(range.id)}
                    className="min-h-11 w-full rounded-md border border-border-default px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:w-auto"
                  >
                    Xóa
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                  <label className="flex flex-col gap-1 text-sm text-text-secondary">
                    <span className="text-[11px] uppercase tracking-wider text-text-muted">Bắt đầu</span>
                    <input
                      name={`edit-class-schedule-from-${range.id}`}
                      type="time"
                      step={1}
                      value={range.from}
                      autoComplete="off"
                      onChange={(e) => handleChangeRange(range.id, "from", e.target.value)}
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    />
                  </label>
                  <div className="flex items-center justify-center pb-2 text-text-muted" aria-hidden>
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-4-4 4 4-4 4" />
                    </svg>
                  </div>
                  <label className="flex flex-col gap-1 text-sm text-text-secondary">
                    <span className="text-[11px] uppercase tracking-wider text-text-muted">Kết thúc</span>
                    <input
                      name={`edit-class-schedule-to-${range.id}`}
                      type="time"
                      step={1}
                      value={range.to}
                      autoComplete="off"
                      onChange={(e) => handleChangeRange(range.id, "to", e.target.value)}
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={classEditorModalFooterClassName}>
          <button
            type="button"
            onClick={onClose}
            className={classEditorModalSecondaryButtonClassName}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className={classEditorModalPrimaryButtonClassName}
          >
            {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </>
  );
}
