"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail, ClassScheduleItem } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import {
  CLASS_SCHEDULE_DAY_OPTIONS,
  normalizeDayOfWeek,
  normalizeTimeOnly,
} from "@/lib/class.helpers";
import { createClientId } from "@/lib/client-id";
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
import UpgradedSelect from "@/components/ui/UpgradedSelect";

type ScheduleRangeForm = {
  id: string;
  dayOfWeek: number;
  from: string;
  to: string;
  teacherId: string;
};

type ScheduleTeacherOption = {
  id: string;
  fullName?: string | null;
};

const EMPTY_SCHEDULE_RANGE = {
  dayOfWeek: 1,
  from: "",
  to: "",
  teacherId: "",
} as const;

type Props = {
  open: boolean;
  onClose: () => void;
  classDetail: ClassDetail;
  teachers?: ScheduleTeacherOption[];
  allowTeacherSelection?: boolean;
  defaultTeacherId?: string;
  onSubmitSchedule?: (data: { schedule: ClassScheduleItem[] }) => Promise<unknown>;
  onScheduleSaved?: () => Promise<unknown> | void;
};

function createScheduleRange(
  range?: Partial<
    Pick<ScheduleRangeForm, "id" | "dayOfWeek" | "from" | "to" | "teacherId">
  >,
  fallbackTeacherId?: string,
): ScheduleRangeForm {
  return {
    id: range?.id ?? createClientId(),
    dayOfWeek: normalizeDayOfWeek(range?.dayOfWeek, EMPTY_SCHEDULE_RANGE.dayOfWeek),
    from: range?.from ?? EMPTY_SCHEDULE_RANGE.from,
    to: range?.to ?? EMPTY_SCHEDULE_RANGE.to,
    teacherId: range?.teacherId ?? fallbackTeacherId ?? EMPTY_SCHEDULE_RANGE.teacherId,
  };
}

function normalizeSchedule(
  schedule: unknown,
  fallbackTeacherId?: string,
): ScheduleRangeForm[] {
  if (!Array.isArray(schedule)) return [];
  return schedule.reduce<ScheduleRangeForm[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const record = item as Record<string, unknown>;
    const from = normalizeTimeOnly(typeof record.from === "string" ? record.from : "");
    const to = normalizeTimeOnly(typeof record.to === "string" ? record.to : "");
    const dayOfWeek = normalizeDayOfWeek(record.dayOfWeek, EMPTY_SCHEDULE_RANGE.dayOfWeek);
    const teacherId =
      typeof record.teacherId === "string" ? record.teacherId : fallbackTeacherId;
    if (!from && !to) return acc;
    return [
      ...acc,
      createScheduleRange(
        {
          id: typeof record.id === "string" ? record.id : undefined,
          dayOfWeek,
          from,
          to,
          teacherId,
        },
        fallbackTeacherId,
      ),
    ];
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
    if (!range.teacherId.trim()) {
      throw new Error("Mỗi khung giờ học phải chọn gia sư chịu trách nhiệm.");
    }
    return [
      ...acc,
      {
        id: range.id,
        dayOfWeek: range.dayOfWeek,
        from,
        to,
        teacherId: range.teacherId,
      },
    ];
  }, []);
}

export default function EditClassSchedulePopup({
  open,
  onClose,
  classDetail,
  teachers,
  allowTeacherSelection,
  defaultTeacherId,
  onSubmitSchedule,
  onScheduleSaved,
}: Props) {
  if (!open) return null;

  return (
    <EditClassScheduleDialog
      onClose={onClose}
      classDetail={classDetail}
      teachers={teachers}
      allowTeacherSelection={allowTeacherSelection}
      defaultTeacherId={defaultTeacherId}
      onSubmitSchedule={onSubmitSchedule}
      onScheduleSaved={onScheduleSaved}
    />
  );
}

function EditClassScheduleDialog({
  onClose,
  classDetail,
  teachers = [],
  allowTeacherSelection = true,
  defaultTeacherId,
  onSubmitSchedule,
  onScheduleSaved,
}: Omit<Props, "open">) {
  const queryClient = useQueryClient();
  const resolvedDefaultTeacherId =
    defaultTeacherId ?? (teachers.length === 1 ? teachers[0]?.id ?? "" : "");
  const [scheduleRanges, setScheduleRanges] = useState<ScheduleRangeForm[]>(() => {
    const normalized = normalizeSchedule(classDetail.schedule, resolvedDefaultTeacherId);
    return normalized.length > 0
      ? normalized
      : [createScheduleRange(undefined, resolvedDefaultTeacherId)];
  });
  const teacherOptions = teachers.map((teacher) => ({
    value: teacher.id,
    label: teacher.fullName?.trim() || "—",
    selectedLabel: teacher.fullName?.trim() || "—",
  }));
  const canAddRange = allowTeacherSelection || Boolean(resolvedDefaultTeacherId);

  const getTeacherLabel = (teacherId?: string) =>
    teachers.find((teacher) => teacher.id === teacherId)?.fullName?.trim() ||
    (teacherId ? "Không còn trong danh sách gia sư của lớp" : "Chưa phân công");

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
      toast.success("Đã lưu khung giờ học.");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật lịch học.";
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    let schedulePayload: ClassScheduleItem[];
    try {
      schedulePayload = buildSchedulePayload(scheduleRanges);
    } catch (error) {
      toast.error((error as Error).message || "Không thể lưu lịch học.");
      return;
    }
    onClose();
    updateMutation.mutate({ schedule: schedulePayload });
  };

  const handleAddRange = () => {
    if (!canAddRange) {
      toast.error("Không thể thêm khung giờ mới khi chưa xác định được gia sư chịu trách nhiệm.");
      return;
    }

    setScheduleRanges((prev) => [
      ...prev,
      createScheduleRange(undefined, resolvedDefaultTeacherId),
    ]);
  };

  const handleRemoveRange = (id: string) => {
    setScheduleRanges((prev) => {
      if (prev.length === 1) return [createScheduleRange(undefined, resolvedDefaultTeacherId)];
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

  const handleDayChange = (id: string, dayOfWeek: number) => {
    setScheduleRanges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dayOfWeek } : item)),
    );
  };

  const handleTeacherChange = (id: string, teacherId: string) => {
    setScheduleRanges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, teacherId } : item)),
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
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Định dạng HH:mm:ss.</p>
              {!allowTeacherSelection ? (
                <p className="text-xs text-text-muted">
                  Gia sư chịu trách nhiệm được giữ theo phân công hiện tại ở staff shell.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleAddRange}
              disabled={!canAddRange}
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
                <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto_1fr] sm:items-end">
                  <label className="flex flex-col gap-1 text-sm text-text-secondary">
                    <span className="text-[11px] uppercase tracking-wider text-text-muted">Ngày</span>
                    <UpgradedSelect
                      name={`edit-class-schedule-day-${range.id}`}
                      value={String(range.dayOfWeek)}
                      onValueChange={(value) =>
                        handleDayChange(range.id, normalizeDayOfWeek(value))
                      }
                      options={CLASS_SCHEDULE_DAY_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                        selectedLabel: option.selectedLabel,
                      }))}
                    />
                  </label>
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
                  <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-4">
                    <span className="text-[11px] uppercase tracking-wider text-text-muted">
                      Gia sư chịu trách nhiệm
                    </span>
                    {allowTeacherSelection ? (
                      <UpgradedSelect
                        name={`edit-class-schedule-teacher-${range.id}`}
                        value={range.teacherId}
                        onValueChange={(value) => handleTeacherChange(range.id, value)}
                        options={teacherOptions}
                        placeholder="Chọn gia sư phụ trách"
                        emptyStateLabel="Lớp chưa có gia sư để gán."
                      />
                    ) : (
                      <div className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary">
                        {getTeacherLabel(range.teacherId || resolvedDefaultTeacherId)}
                      </div>
                    )}
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
