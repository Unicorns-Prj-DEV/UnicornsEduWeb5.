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

function getAttendanceStatusMeta(status: SessionAttendanceStatus): {
  label: string;
  badgeClassName: string;
} {
  switch (status) {
    case "present":
      return {
        label: "Học",
        badgeClassName: "bg-success/15 text-success",
      };
    case "excused":
      return {
        label: "Phép",
        badgeClassName: "bg-warning/15 text-warning",
      };
    default:
      return {
        label: "Vắng",
        badgeClassName: "bg-error/15 text-error",
      };
  }
}

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
      <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 p-2 sm:p-4">
        <div className="mx-auto flex h-full w-full max-w-[72rem] items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-session-title"
            className="flex max-h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-border-default bg-bg-surface p-3 shadow-2xl sm:p-5"
          >
            <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-border-default/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="add-session-title" className="text-lg font-semibold text-text-primary">
                  Thêm buổi học
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Hoàn thiện thông tin buổi học và điểm danh ngay trong một màn hình.
                </p>
              </div>
              <div className="flex items-start justify-between gap-2 sm:justify-end">
                <div className="rounded-[1.15rem] border border-primary/15 bg-primary/5 px-3.5 py-2 shadow-sm">
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
                  className="rounded-xl p-2 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 sm:pr-2">
                <section className="rounded-[1.5rem] border border-border-default bg-bg-secondary/50 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
                        Thông tin buổi học
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        Sắp xếp lại thông tin chính trước khi chuyển sang điểm danh.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-2">
                      <span>Ngày học</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-2">
                      <span>Gia sư phụ trách</span>
                      <select
                        value={selectedTeacherId}
                        onChange={(event) => setSelectedTeacherId(event.target.value)}
                        className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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

                    <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-1">
                      <span>Bắt đầu</span>
                      <input
                        type="time"
                        step={1}
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-1">
                      <span>Kết thúc</span>
                      <input
                        type="time"
                        step={1}
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                        className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-2">
                      <span>Hệ số (coefficient)</span>
                      <input
                        type="number"
                        min={0.1}
                        max={9.9}
                        step={0.1}
                        value={coefficient}
                        onChange={(e) => setCoefficient(e.target.value)}
                        className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        placeholder="1"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-2">
                      <span>Trợ cấp buổi (VNĐ)</span>
                      <input
                        type="number"
                        min={0}
                        value={allowanceAmount}
                        onChange={(e) => setAllowanceAmount(e.target.value)}
                        className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        placeholder="Để trống = theo gia sư"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2 xl:col-span-6">
                      <span>Ghi chú buổi học</span>
                      <RichTextEditor
                        value={notes}
                        onChange={setNotes}
                        minHeight="min-h-[180px]"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-border-default bg-bg-secondary/50 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
                        Điểm danh học sinh
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        Trên mobile dùng dạng thẻ, trên desktop giữ bảng để thao tác nhanh hơn.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                      <div className="rounded-2xl border border-success/15 bg-success/5 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Học
                        </p>
                        <p className="mt-1 text-sm font-semibold text-success">
                          {attendanceSummary.present}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-warning/15 bg-warning/5 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Phép
                        </p>
                        <p className="mt-1 text-sm font-semibold text-warning">
                          {attendanceSummary.excused}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-error/15 bg-error/5 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Vắng
                        </p>
                        <p className="mt-1 text-sm font-semibold text-error">
                          {attendanceSummary.absent}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border-default bg-bg-surface px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Mặc định
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
                          {formatCurrency(attendanceDefaultTuitionTotal)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Đang áp dụng
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-primary">
                          {formatCurrency(resolvedSessionTuitionTotal)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border-default bg-bg-surface px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Điều chỉnh
                        </p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">
                          {attendanceOverrideCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-default bg-bg-surface px-4 py-6 text-center text-sm text-text-muted">
                      Lớp chưa có học sinh.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 lg:hidden">
                        {attendanceItems.map((item) => {
                          const statusMeta = getAttendanceStatusMeta(item.status);

                          return (
                            <article
                              key={item.studentId}
                              className="rounded-[1.25rem] border border-border-default bg-bg-surface p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-text-primary">
                                    {item.fullName}
                                  </p>
                                  <p className="mt-1 text-xs text-text-muted">
                                    Mặc định:{" "}
                                    <span className="font-medium tabular-nums text-text-primary">
                                      {item.defaultTuitionFee != null
                                        ? formatCurrency(item.defaultTuitionFee)
                                        : "Chưa cấu hình"}
                                    </span>
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.badgeClassName}`}
                                >
                                  {statusMeta.label}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                                  <span>Trạng thái</span>
                                  <select
                                    value={item.status}
                                    onChange={(event) =>
                                      handleAttendanceStatusChange(
                                        item.studentId,
                                        event.target.value as SessionAttendanceStatus,
                                      )
                                    }
                                    className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                  >
                                    {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                                  <span>Học phí buổi</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.tuitionFee}
                                    onChange={(event) =>
                                      handleAttendanceTuitionChange(item.studentId, event.target.value)
                                    }
                                    className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                    placeholder={
                                      item.defaultTuitionFee != null
                                        ? String(item.defaultTuitionFee)
                                        : "Theo học sinh"
                                    }
                                  />
                                </label>

                                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                                  <span>Ghi chú</span>
                                  <input
                                    value={item.notes}
                                    onChange={(event) =>
                                      handleAttendanceNotesChange(item.studentId, event.target.value)
                                    }
                                    maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                                    className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                    placeholder="Ghi chú điểm danh (nếu có)"
                                  />
                                </label>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <div className="hidden overflow-x-auto rounded-[1.25rem] border border-border-default bg-bg-surface lg:block">
                        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
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
                                    className="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                                    className="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                                      className="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                    </>
                  )}
                </section>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border-default pt-4 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createSessionMutation.isPending}
                  className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
                >
                  {createSessionMutation.isPending ? "Đang lưu…" : "Thêm buổi học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
