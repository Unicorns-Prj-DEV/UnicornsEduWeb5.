"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail, ClassStatus, ClassType, UpdateClassPayload } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import { normalizeTimeOnly } from "@/lib/class.helpers";

type EditMode = "basic" | "tuition" | "schedule";

type ScheduleRangeForm = {
  id: string;
  from: string;
  to: string;
};

const EMPTY_SCHEDULE_RANGE = {
  from: "",
  to: "",
} as const;

type Props = {
  open: boolean;
  mode: EditMode;
  onClose: () => void;
  classDetail: ClassDetail;
};

const STATUS_OPTIONS: { value: ClassStatus; label: string }[] = [
  { value: "running", label: "Đang chạy" },
  { value: "ended", label: "Đã kết thúc" },
];

const TYPE_OPTIONS: { value: ClassType; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "vip", label: "VIP" },
  { value: "advance", label: "Advance" },
  { value: "hardcore", label: "Hardcore" },
];

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

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.floor(parsed);
}

function popupTitle(mode: EditMode): string {
  if (mode === "basic") return "Chỉnh sửa thông tin cơ bản";
  if (mode === "tuition") return "Chỉnh sửa học phí";
  return "Chỉnh sửa lịch học";
}

function submitLabel(mode: EditMode): string {
  if (mode === "basic") return "Lưu thông tin cơ bản";
  if (mode === "tuition") return "Lưu học phí";
  return "Lưu lịch học";
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

function buildSchedulePayload(scheduleRanges: ScheduleRangeForm[]): NonNullable<UpdateClassPayload["schedule"]> {
  return scheduleRanges.reduce<NonNullable<UpdateClassPayload["schedule"]>>((acc, range) => {
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

export default function EditClassPopup({ open, mode, onClose, classDetail }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(classDetail.name ?? "");
  const [type, setType] = useState<ClassType>(classDetail.type);
  const [status, setStatus] = useState<ClassStatus>(classDetail.status);

  const [maxStudentsInput, setMaxStudentsInput] = useState(String(classDetail.maxStudents ?? ""));
  const [allowancePerSessionInput, setAllowancePerSessionInput] = useState(
    String(classDetail.allowancePerSessionPerStudent ?? ""),
  );
  const [maxAllowancePerSessionInput, setMaxAllowancePerSessionInput] = useState(
    classDetail.maxAllowancePerSession == null ? "" : String(classDetail.maxAllowancePerSession),
  );
  const [scaleAmountInput, setScaleAmountInput] = useState(
    classDetail.scaleAmount == null ? "" : String(classDetail.scaleAmount),
  );

  const [studentTuitionPerSessionInput, setStudentTuitionPerSessionInput] = useState(
    classDetail.studentTuitionPerSession == null ? "" : String(classDetail.studentTuitionPerSession),
  );
  const [tuitionPackageTotalInput, setTuitionPackageTotalInput] = useState(
    classDetail.tuitionPackageTotal == null ? "" : String(classDetail.tuitionPackageTotal),
  );
  const [tuitionPackageSessionInput, setTuitionPackageSessionInput] = useState(
    classDetail.tuitionPackageSession == null ? "" : String(classDetail.tuitionPackageSession),
  );
  const [scheduleRanges, setScheduleRanges] = useState<ScheduleRangeForm[]>(() => {
    const normalized = normalizeSchedule(classDetail.schedule);
    return normalized.length > 0 ? normalized : [createScheduleRange()];
  });

  useEffect(() => {
    if (!open) return;

    setName(classDetail.name ?? "");
    setType(classDetail.type);
    setStatus(classDetail.status);

    setMaxStudentsInput(String(classDetail.maxStudents ?? ""));
    setAllowancePerSessionInput(String(classDetail.allowancePerSessionPerStudent ?? ""));
    setMaxAllowancePerSessionInput(
      classDetail.maxAllowancePerSession == null ? "" : String(classDetail.maxAllowancePerSession),
    );
    setScaleAmountInput(classDetail.scaleAmount == null ? "" : String(classDetail.scaleAmount));

    setStudentTuitionPerSessionInput(
      classDetail.studentTuitionPerSession == null ? "" : String(classDetail.studentTuitionPerSession),
    );
    setTuitionPackageTotalInput(
      classDetail.tuitionPackageTotal == null ? "" : String(classDetail.tuitionPackageTotal),
    );
    setTuitionPackageSessionInput(
      classDetail.tuitionPackageSession == null ? "" : String(classDetail.tuitionPackageSession),
    );

    const normalized = normalizeSchedule(classDetail.schedule);
    setScheduleRanges(normalized.length > 0 ? normalized : [createScheduleRange()]);
  }, [open, classDetail, mode]);

  const updateMutation = useMutation({
    mutationFn: classApi.updateClass,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["class", "detail", classDetail.id] }),
        queryClient.invalidateQueries({ queryKey: ["class", "list"] }),
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật lớp học.";
      toast.error(msg);
    },
  });

  const submitUpdate = async (payload: UpdateClassPayload, successText: string) => {
    try {
      await updateMutation.mutateAsync(payload);
      toast.success(successText);
      onClose();
    } catch {
      // lỗi đã được xử lý trong onError
    }
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === "basic") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        toast.error("Tên lớp là bắt buộc.");
        return;
      }

      const maxStudents = parseOptionalInt(maxStudentsInput);
      if (maxStudents !== undefined && maxStudents < 1) {
        toast.error("Sĩ số tối đa phải lớn hơn hoặc bằng 1.");
        return;
      }

      await submitUpdate(
        {
          id: classDetail.id,
          name: trimmedName,
          type,
          status,
          max_students: maxStudents,
          allowance_per_session_per_student: parseOptionalInt(allowancePerSessionInput),
          max_allowance_per_session: parseOptionalInt(maxAllowancePerSessionInput),
          scale_amount: parseOptionalInt(scaleAmountInput),
        },
        "Đã lưu thông tin cơ bản.",
      );
      return;
    }

    if (mode === "tuition") {
      await submitUpdate(
        {
          id: classDetail.id,
          student_tuition_per_session: parseOptionalInt(studentTuitionPerSessionInput),
          tuition_package_total: parseOptionalInt(tuitionPackageTotalInput),
          tuition_package_session: parseOptionalInt(tuitionPackageSessionInput),
        },
        "Đã lưu học phí.",
      );
      return;
    }

    let schedulePayload: NonNullable<UpdateClassPayload["schedule"]>;

    try {
      schedulePayload = buildSchedulePayload(scheduleRanges);
    } catch (error) {
      toast.error((error as Error).message || "Không thể lưu lịch học.");
      return;
    }

    await submitUpdate(
      {
        id: classDetail.id,
        schedule: schedulePayload,
      },
      "Đã lưu lịch học.",
    );
  };

  const handleAddRange = () => {
    setScheduleRanges((prev) => [...prev, createScheduleRange()]);
  };

  const handleRemoveRange = (id: string) => {
    setScheduleRanges((prev) => {
      if (prev.length === 1) {
        return [createScheduleRange()];
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const handleChangeRange = (id: string, field: keyof Pick<ScheduleRangeForm, "from" | "to">, value: string) => {
    const normalizedValue = normalizeTimeOnly(value);
    setScheduleRanges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: normalizedValue } : item)),
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="edit-class-title" className="text-lg font-semibold text-text-primary">
            {popupTitle(mode)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[76vh] space-y-4 overflow-y-auto pr-1">
          {mode === "basic" ? (
            <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Tên lớp</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="Ví dụ: Math 10A"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Loại lớp</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ClassType)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Trạng thái</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ClassStatus)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Sĩ số tối đa</span>
                  <input
                    type="number"
                    min={1}
                    value={maxStudentsInput}
                    onChange={(e) => setMaxStudentsInput(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Allowance/buổi/học sinh</span>
                  <input
                    type="number"
                    min={0}
                    value={allowancePerSessionInput}
                    onChange={(e) => setAllowancePerSessionInput(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Allowance tối đa/buổi</span>
                  <input
                    type="number"
                    min={0}
                    value={maxAllowancePerSessionInput}
                    onChange={(e) => setMaxAllowancePerSessionInput(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary md:col-span-2">
                  <span>Scale amount</span>
                  <input
                    type="number"
                    min={0}
                    value={scaleAmountInput}
                    onChange={(e) => setScaleAmountInput(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
              </div>
            </section>
          ) : null}

          {mode === "tuition" ? (
            <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Học phí mỗi buổi</span>
                  <input
                    type="number"
                    min={0}
                    value={studentTuitionPerSessionInput}
                    onChange={(e) => setStudentTuitionPerSessionInput(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Gói học phí tổng</span>
                  <input
                    type="number"
                    min={0}
                    value={tuitionPackageTotalInput}
                    onChange={(e) => setTuitionPackageTotalInput(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary md:col-span-2">
                  <span>Số buổi gói học phí</span>
                  <input
                    type="number"
                    min={0}
                    value={tuitionPackageSessionInput}
                    onChange={(e) => setTuitionPackageSessionInput(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
              </div>
            </section>
          ) : null}

          {mode === "schedule" ? (
            <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Khung giờ học</h3>
                  <p className="mt-1 text-xs text-text-muted">Chỉ lưu giờ-phút-giây theo định dạng HH:mm:ss.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRange}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  + Thêm khung giờ
                </button>
              </div>

              <div className="space-y-3">
                {scheduleRanges.map((range, index) => (
                  <div
                    key={range.id}
                    className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:bg-bg-secondary/80"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-text-muted">
                        Time Card {String(index + 1).padStart(2, "0")}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveRange(range.id)}
                        className="rounded-md border border-border-default px-3 py-1.5 text-sm font-medium text-text-muted transition-colors duration-200 hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        Xóa
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                      <label className="flex flex-col gap-1 text-sm text-text-secondary">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Bắt đầu</span>
                        <input
                          type="time"
                          step={1}
                          value={range.from}
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
                        <span className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Kết thúc</span>
                        <input
                          type="time"
                          step={1}
                          value={range.to}
                          onChange={(e) => handleChangeRange(range.id, "to", e.target.value)}
                          className="rounded-md border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              {updateMutation.isPending ? "Đang lưu…" : submitLabel(mode)}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
