"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SessionAttendanceItem,
  SessionAttendanceStatus,
  SessionCreatePayload,
  SessionItem,
} from "@/dtos/session.dto";
import * as sessionApi from "@/lib/apis/session.api";
import { formatCurrency } from "@/lib/class.helpers";
import RichTextEditor from "@/components/ui/RichTextEditor";

export interface SessionStudentItem {
  id: string;
  fullName: string;
  tuitionFee?: number | null;
}

type AttendanceFormItem = {
  studentId: string;
  fullName: string;
  status: SessionAttendanceStatus;
  notes: string;
  tuitionFee: string;
  defaultTuitionFee: number | null;
};

type SessionTeacherItem = {
  id: string;
  fullName?: string | null;
};

type Props = {
  open: boolean;
  classId: string;
  defaultTeacherId?: string;
  teachers?: SessionTeacherItem[];
  students: SessionStudentItem[];
  sessionTuitionTotal?: number;
  onClose: () => void;
  onCreated?: (session: SessionItem) => void;
};

const ATTENDANCE_STATUS_OPTIONS: Array<{ value: SessionAttendanceStatus; label: string }> = [
  { value: "present", label: "Học" },
  { value: "excused", label: "Phép" },
  { value: "absent", label: "Vắng" },
];

function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTimeInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const matched = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!matched) return "";

  const [, h, m, s = "00"] = matched;
  return `${h}:${m}:${s}`;
}

const MAX_SESSION_NOTES_LENGTH = 2000;
const MAX_ATTENDANCE_NOTES_LENGTH = 500;

function toAttendancePayload(items: AttendanceFormItem[]): SessionAttendanceItem[] {
  return items.map((item) => ({
    studentId: item.studentId,
    status: item.status,
    notes: item.notes.trim() || null,
    ...(item.tuitionFee.trim() !== ""
      ? { tuitionFee: Math.floor(Number(item.tuitionFee)) }
      : {}),
  }));
}

function normalizeMoneyValue(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(normalized)) return null;
  return Math.floor(normalized);
}

function isNonNegativeMoneyInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalized = Number(trimmed);
  return Number.isFinite(normalized) && normalized >= 0;
}

function resolveAttendanceTuitionValue(item: AttendanceFormItem): number {
  const normalizedInput = normalizeMoneyValue(item.tuitionFee);
  if (item.tuitionFee.trim() !== "" && normalizedInput != null && normalizedInput >= 0) {
    return normalizedInput;
  }

  return normalizeMoneyValue(item.defaultTuitionFee) ?? 0;
}

export default function AddSessionPopup({
  open,
  classId,
  defaultTeacherId,
  teachers = [],
  students,
  sessionTuitionTotal = 0,
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => getTodayDateInputValue());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [notes, setNotes] = useState("");
  const [coefficient, setCoefficient] = useState<string>("1");
  const [allowanceAmount, setAllowanceAmount] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    defaultTeacherId ?? teachers[0]?.id ?? "",
  );
  const [attendanceItems, setAttendanceItems] = useState<AttendanceFormItem[]>(() =>
    students.map((student) => ({
      studentId: student.id,
      fullName: student.fullName,
      status: "present",
      notes: "",
      tuitionFee: "",
      defaultTuitionFee: normalizeMoneyValue(student.tuitionFee),
    })),
  );

  const attendanceSummary = useMemo(() => {
    return attendanceItems.reduce(
      (acc, item) => ({
        ...acc,
        [item.status]: acc[item.status] + 1,
      }),
      {
        present: 0,
        excused: 0,
        absent: 0,
      },
    );
  }, [attendanceItems]);
  const resolvedSessionTuitionTotal = useMemo(() => {
    if (attendanceItems.length === 0) {
      return sessionTuitionTotal;
    }

    return attendanceItems.reduce((sum, item) => sum + resolveAttendanceTuitionValue(item), 0);
  }, [attendanceItems, sessionTuitionTotal]);
  const attendanceDefaultTuitionTotal = useMemo(
    () =>
      attendanceItems.reduce(
        (sum, item) => sum + (normalizeMoneyValue(item.defaultTuitionFee) ?? 0),
        0,
      ),
    [attendanceItems],
  );
  const attendanceOverrideCount = useMemo(
    () => attendanceItems.filter((item) => item.tuitionFee.trim() !== "").length,
    [attendanceItems],
  );

  const createSessionMutation = useMutation({
    mutationFn: (payload: SessionCreatePayload) => sessionApi.createSession(payload),
    onSuccess: async (createdSession) => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", "class", classId] });
      toast.success("Đã thêm buổi học.");
      onCreated?.(createdSession);
      onClose();
    },
    onError: () => {
      toast.error("Không thể thêm buổi học. Vui lòng thử lại.");
    },
  });

  const handleAttendanceStatusChange = (
    studentId: string,
    status: SessionAttendanceStatus,
  ) => {
    setAttendanceItems((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              status,
            }
          : item,
      ),
    );
  };

  const handleAttendanceNotesChange = (studentId: string, value: string) => {
    setAttendanceItems((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              notes: value,
            }
          : item,
      ),
    );
  };

  const handleAttendanceTuitionChange = (studentId: string, value: string) => {
    setAttendanceItems((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              tuitionFee: value,
            }
          : item,
      ),
    );
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedTeacherId) {
      toast.error("Vui lòng chọn gia sư phụ trách.");
      return;
    }

    if (students.length === 0) {
      toast.error("Lớp chưa có học sinh để điểm danh.");
      return;
    }

    const normalizedStartTime = normalizeTimeInput(startTime);
    const normalizedEndTime = normalizeTimeInput(endTime);

    if (!normalizedStartTime || !normalizedEndTime) {
      toast.error("Thời gian buổi học không hợp lệ.");
      return;
    }

    if (normalizedEndTime <= normalizedStartTime) {
      toast.error("Giờ kết thúc phải lớn hơn giờ bắt đầu.");
      return;
    }

    const trimmedSessionNotes = notes.trim();
    const notesTextContent = trimmedSessionNotes.replace(/<[^>]*>/g, "").trim();

    if (!notesTextContent) {
      toast.error("Vui lòng nhập ghi chú buổi học.");
      return;
    }

    if (trimmedSessionNotes.length > MAX_SESSION_NOTES_LENGTH) {
      toast.error(`Ghi chú buổi học tối đa ${MAX_SESSION_NOTES_LENGTH} ký tự.`);
      return;
    }

    const hasAttendanceNotesTooLong = attendanceItems.some(
      (item) => item.notes.trim().length > MAX_ATTENDANCE_NOTES_LENGTH,
    );

    if (hasAttendanceNotesTooLong) {
      toast.error(`Ghi chú điểm danh tối đa ${MAX_ATTENDANCE_NOTES_LENGTH} ký tự.`);
      return;
    }

    const hasInvalidAttendanceTuition = attendanceItems.some(
      (item) => !isNonNegativeMoneyInput(item.tuitionFee),
    );

    if (hasInvalidAttendanceTuition) {
      toast.error("Học phí từng học sinh phải là số không âm.");
      return;
    }

    const coeffStr = coefficient.trim();
    const allowanceStr = allowanceAmount.trim();
    const coeffNum = coeffStr ? Number(coefficient) : 1;
    const allowanceNum = allowanceStr ? Number(allowanceAmount) : undefined;

    if (coeffStr && (!Number.isFinite(coeffNum) || coeffNum < 0.1 || coeffNum > 9.9)) {
      toast.error("Hệ số (coefficient) phải là số từ 0.1 đến 9.9.");
      return;
    }
    if (allowanceStr && (allowanceNum === undefined || !Number.isFinite(allowanceNum) || allowanceNum < 0)) {
      toast.error("Trợ cấp buổi phải là số không âm.");
      return;
    }

    const payload: SessionCreatePayload = {
      classId,
      teacherId: selectedTeacherId,
      date,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      notes: trimmedSessionNotes,
      ...(Number.isFinite(coeffNum) && coeffNum >= 0.1 && coeffNum <= 9.9 && { coefficient: coeffNum }),
      ...(allowanceNum !== undefined && Number.isFinite(allowanceNum) && allowanceNum >= 0
        ? { allowanceAmount: Math.floor(allowanceNum) }
        : {}),
      attendance: toAttendancePayload(attendanceItems),
    };

    try {
      await createSessionMutation.mutateAsync(payload);
    } catch {
      // handled in onError
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-session-title"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 id="add-session-title" className="text-lg font-semibold text-text-primary">
            Thêm buổi học
          </h2>
          <div className="flex items-start justify-between gap-2 sm:justify-end">
            <div className="rounded-[1rem] border border-primary/15 bg-primary/5 px-3.5 py-2 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Tổng học phí buổi này
              </p>
              <p className="mt-1 text-right text-sm font-semibold tabular-nums text-primary sm:text-base">
                {formatCurrency(resolvedSessionTuitionTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Đóng"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto pr-1">
          <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
              Thông tin buổi học
            </h3>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Ngày học</span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Gia sư phụ trách</span>
                <select
                  value={selectedTeacherId}
                  onChange={(event) => setSelectedTeacherId(event.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  required
                >
                  <option value="" disabled>
                    Chọn gia sư
                  </option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName?.trim() || "Gia sư"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Bắt đầu</span>
                <input
                  type="time"
                  step={1}
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Kết thúc</span>
                <input
                  type="time"
                  step={1}
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Hệ số (coefficient)</span>
                <input
                  type="number"
                  min={0.1}
                  max={9.9}
                  step={0.1}
                  value={coefficient}
                  onChange={(e) => setCoefficient(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="1"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Trợ cấp buổi (VNĐ)</span>
                <input
                  type="number"
                  min={0}
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Để trống = theo gia sư"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary md:col-span-3">
                <span>Ghi chú buổi học</span>
                <RichTextEditor
                  value={notes}
                  onChange={setNotes}
                  minHeight="min-h-[160px]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Điểm danh học sinh
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  Để trống học phí để dùng mức mặc định của học sinh trong lớp.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                <span>
                  <span className="font-semibold text-success">Học:</span> {attendanceSummary.present}
                </span>
                <span>
                  <span className="font-semibold text-warning">Phép:</span> {attendanceSummary.excused}
                </span>
                <span>
                  <span className="font-semibold text-error">Vắng:</span> {attendanceSummary.absent}
                </span>
                <span>
                  <span className="font-semibold text-primary">Mặc định:</span>{" "}
                  {formatCurrency(attendanceDefaultTuitionTotal)}
                </span>
                <span>
                  <span className="font-semibold text-primary">Đang áp dụng:</span>{" "}
                  {formatCurrency(resolvedSessionTuitionTotal)}
                </span>
                <span>
                  <span className="font-semibold text-text-primary">Điều chỉnh:</span>{" "}
                  {attendanceOverrideCount}
                </span>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-default bg-bg-surface px-4 py-6 text-center text-sm text-text-muted">
                Lớp chưa có học sinh.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border-default bg-bg-surface">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách điểm danh học sinh</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary">
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Học sinh
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Trạng thái
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Ghi chú
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Học phí buổi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceItems.map((item) => (
                      <tr
                        key={item.studentId}
                        className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                      >
                        <td className="px-4 py-3 text-text-primary">{item.fullName}</td>
                        <td className="px-4 py-3">
                          <select
                            value={item.status}
                            onChange={(event) =>
                              handleAttendanceStatusChange(
                                item.studentId,
                                event.target.value as SessionAttendanceStatus,
                              )
                            }
                            className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            value={item.notes}
                            onChange={(event) =>
                              handleAttendanceNotesChange(item.studentId, event.target.value)
                            }
                            maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                            className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            placeholder="Ghi chú điểm danh (nếu có)"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <input
                              type="number"
                              min={0}
                              value={item.tuitionFee}
                              onChange={(event) =>
                                handleAttendanceTuitionChange(item.studentId, event.target.value)
                              }
                              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                              placeholder={
                                item.defaultTuitionFee != null
                                  ? String(item.defaultTuitionFee)
                                  : "Theo học sinh"
                              }
                            />
                            <p className="text-xs text-text-muted">
                              Mặc định:{" "}
                              <span className="font-medium tabular-nums text-text-primary">
                                {item.defaultTuitionFee != null
                                  ? formatCurrency(item.defaultTuitionFee)
                                  : "Chưa cấu hình"}
                              </span>
                            </p>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-default pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createSessionMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              {createSessionMutation.isPending ? "Đang lưu…" : "Thêm buổi học"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
