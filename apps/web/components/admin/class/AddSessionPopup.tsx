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
import UpgradedSelect from "@/components/ui/UpgradedSelect";

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

type SessionTeacherMode = "select" | "readOnly";

type Props = {
  open: boolean;
  classId: string;
  defaultTeacherId?: string;
  teachers?: SessionTeacherItem[];
  students: SessionStudentItem[];
  sessionTuitionTotal?: number;
  teacherMode?: SessionTeacherMode;
  allowFinancialFields?: boolean;
  createSessionFn?: (payload: SessionCreatePayload) => Promise<SessionItem>;
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

function resolveSelectedTeacherId(options: {
  defaultTeacherId?: string;
  teacherMode: SessionTeacherMode;
  teachers: SessionTeacherItem[];
}): string {
  if (options.defaultTeacherId) {
    return options.defaultTeacherId;
  }

  if (options.teacherMode === "readOnly" && options.teachers.length === 1) {
    return options.teachers[0]?.id ?? "";
  }

  if (options.teacherMode === "select") {
    return options.teachers[0]?.id ?? "";
  }

  return "";
}

export default function AddSessionPopup({
  open,
  classId,
  defaultTeacherId,
  teachers = [],
  students,
  sessionTuitionTotal = 0,
  teacherMode = "select",
  allowFinancialFields = true,
  createSessionFn = sessionApi.createSession,
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
    resolveSelectedTeacherId({
      defaultTeacherId,
      teacherMode,
      teachers,
    }),
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
  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId],
  );

  const createSessionMutation = useMutation({
    mutationFn: (payload: SessionCreatePayload) => createSessionFn(payload),
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
      toast.error(
        teacherMode === "readOnly"
          ? "Lớp phải có đúng 1 gia sư phụ trách trước khi thêm buổi học."
          : "Vui lòng chọn gia sư phụ trách.",
      );
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

    const hasInvalidAttendanceTuition =
      allowFinancialFields &&
      attendanceItems.some((item) => !isNonNegativeMoneyInput(item.tuitionFee));

    if (hasInvalidAttendanceTuition) {
      toast.error("Học phí từng học sinh phải là số không âm.");
      return;
    }

    const coeffStr = allowFinancialFields ? coefficient.trim() : "";
    const allowanceStr = allowFinancialFields ? allowanceAmount.trim() : "";
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
      ...(allowFinancialFields &&
        Number.isFinite(coeffNum) &&
        coeffNum >= 0.1 &&
        coeffNum <= 9.9
        ? { coefficient: coeffNum }
        : {}),
      ...(allowFinancialFields &&
        allowanceNum !== undefined &&
        Number.isFinite(allowanceNum) &&
        allowanceNum >= 0
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
      <div className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4">
        <div className="mx-auto flex min-h-full w-full max-w-[72rem] items-start py-2 sm:items-center sm:py-0">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-session-title"
            className="my-auto flex max-h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-border-default bg-bg-surface p-3 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-5"
          >
            <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-border-default/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="add-session-title" className="text-lg font-semibold text-text-primary">
                  Thêm buổi học
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {allowFinancialFields
                    ? "Hoàn thiện thời gian, cấu hình và điểm danh trong cùng một biểu mẫu."
                    : "Cập nhật ngày học, giờ học, ghi chú và điểm danh trong cùng một biểu mẫu."}
                </p>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2 sm:justify-end">
                {allowFinancialFields ? (
                  <div className="rounded-[1.15rem] border border-primary/15 bg-primary/5 px-3.5 py-2 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Tổng học phí buổi này
                    </p>
                    <p className="mt-1 text-right text-sm font-semibold tabular-nums text-primary sm:text-base">
                      {formatCurrency(resolvedSessionTuitionTotal)}
                    </p>
                  </div>
                ) : null}
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

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-scroll">
                <div className="min-h-0 h-full space-y-4 overflow-y-auto pr-1 sm:pr-2">
                  <section className="rounded-[1.5rem] border border-border-default bg-bg-secondary/50 p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Cấu hình buổi học
                        </h3>
                        <p className="mt-1 text-xs text-text-muted">
                          Mở rộng bố cục trên desktop nhưng vẫn ưu tiên thao tác một tay trên mobile.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                      <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-2">
                        <span>Ngày học</span>
                        <input
                          name="add-session-date"
                          type="date"
                          value={date}
                          autoComplete="off"
                          onChange={(event) => setDate(event.target.value)}
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          required
                        />
                      </label>

                      {teacherMode === "select" ? (
                        <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-4">
                          <span>Gia sư phụ trách</span>
                          <UpgradedSelect
                            name="add-session-teacher"
                            value={selectedTeacherId}
                            onValueChange={setSelectedTeacherId}
                            options={teachers.map((teacher) => ({
                              value: teacher.id,
                              label: teacher.fullName?.trim() || "Gia sư",
                            }))}
                            placeholder="Chọn gia sư"
                            buttonClassName="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          />
                        </label>
                      ) : (
                        <div className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-4">
                          <span>Gia sư phụ trách</span>
                          <div
                            className={`min-h-11 rounded-xl border px-3 py-2 ${selectedTeacher
                              ? "border-border-default bg-bg-surface text-text-primary"
                              : "border-warning/30 bg-warning/10 text-warning"
                              }`}
                          >
                            <p className="font-medium">
                              {selectedTeacher?.fullName?.trim() || "Chưa có gia sư cố định cho lớp."}
                            </p>
                            <p className="mt-1 text-xs opacity-80">
                              {selectedTeacher
                                ? "Gia sư được khóa theo gia sư phụ trách hiện tại của lớp."
                                : "Admin cần phân công đúng 1 gia sư trước khi tạo buổi học."}
                            </p>
                          </div>
                        </div>
                      )}

                      <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-1">
                        <span>Giờ bắt đầu</span>
                        <input
                          name="add-session-start-time"
                          type="time"
                          step={1}
                          value={startTime}
                          autoComplete="off"
                          onChange={(event) => setStartTime(event.target.value)}
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          required
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-1">
                        <span>Giờ kết thúc</span>
                        <input
                          name="add-session-end-time"
                          type="time"
                          step={1}
                          value={endTime}
                          autoComplete="off"
                          onChange={(event) => setEndTime(event.target.value)}
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          required
                        />
                      </label>

                      {allowFinancialFields ? (
                        <>
                          <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-2">
                            <span>Hệ số (coefficient)</span>
                            <input
                              name="add-session-coefficient"
                              type="number"
                              min={0.1}
                              max={9.9}
                              step={0.1}
                              value={coefficient}
                              autoComplete="off"
                              onChange={(e) => setCoefficient(e.target.value)}
                              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                              placeholder="1"
                            />
                          </label>

                          <label className="flex flex-col gap-1 text-sm text-text-secondary xl:col-span-2">
                            <span>Trợ cấp buổi (VNĐ)</span>
                            <input
                              name="add-session-allowance"
                              type="number"
                              min={0}
                              value={allowanceAmount}
                              autoComplete="off"
                              onChange={(e) => setAllowanceAmount(e.target.value)}
                              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                              placeholder="Để trống = theo gia sư"
                            />
                          </label>

                          <p className="rounded-2xl border border-border-default/80 bg-bg-surface px-3 py-2 text-xs text-text-muted sm:col-span-2 xl:col-span-6">
                            Có thể để trống trợ cấp buổi để backend dùng cấu hình hiện tại của lớp hoặc gia sư.
                          </p>
                        </>
                      ) : null}

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
                    <div className="mb-4 flex flex-col gap-3 xl:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Điểm danh học sinh
                        </h3>
                        <p className="mt-1 text-xs text-text-muted">
                          Mobile dùng dạng thẻ để tránh kéo ngang, desktop giữ bảng để chỉnh hàng loạt.
                        </p>
                      </div>

                      {attendanceItems.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-row justify-between gap-2">
                            <div className="flex-1 rounded-2xl border border-success/15 bg-success/5 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                                Học
                              </p>
                              <p className="mt-1 text-sm font-semibold text-success">
                                {attendanceSummary.present}
                              </p>
                            </div>
                            <div className="flex-1 rounded-2xl border border-warning/15 bg-warning/5 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                                Phép
                              </p>
                              <p className="mt-1 text-sm font-semibold text-warning">
                                {attendanceSummary.excused}
                              </p>
                            </div>
                            <div className="flex-1 rounded-2xl border border-error/15 bg-error/5 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                                Vắng
                              </p>
                              <p className="mt-1 text-sm font-semibold text-error">
                                {attendanceSummary.absent}
                              </p>
                            </div>
                          </div>
                          {allowFinancialFields ? (
                            <div className="flex flex-row justify-between gap-2">
                              <div className="flex-1 rounded-2xl border border-border-default bg-bg-surface px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                                  Mặc định
                                </p>
                                <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
                                  {formatCurrency(attendanceDefaultTuitionTotal)}
                                </p>
                              </div>
                              <div className="flex-1 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                                  Đang áp dụng
                                </p>
                                <p className="mt-1 text-sm font-semibold tabular-nums text-primary">
                                  {formatCurrency(resolvedSessionTuitionTotal)}
                                </p>
                              </div>
                              <div className="flex-1 rounded-2xl border border-border-default bg-bg-surface px-3 py-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                                  Điều chỉnh
                                </p>
                                <p className="mt-1 text-sm font-semibold text-text-primary">
                                  {attendanceOverrideCount} học sinh
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {students.length === 0 ? (
                      <p className="py-4 text-center text-sm text-text-muted">Lớp chưa có học sinh.</p>
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
                                    {allowFinancialFields ? (
                                      <p className="mt-1 text-xs text-text-muted">
                                        Mặc định:{" "}
                                        <span className="font-medium tabular-nums text-text-primary">
                                          {item.defaultTuitionFee != null
                                            ? formatCurrency(item.defaultTuitionFee)
                                            : "Chưa cấu hình"}
                                        </span>
                                      </p>
                                    ) : null}
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.badgeClassName}`}
                                  >
                                    {statusMeta.label}
                                  </span>
                                </div>

                                <div className={`mt-4 grid gap-3 ${allowFinancialFields ? "sm:grid-cols-2" : ""}`}>
                                  <label className="flex flex-col gap-1 text-sm text-text-secondary">
                                    <span>Trạng thái</span>
                                    <UpgradedSelect
                                      name={`add-session-attendance-status-${item.studentId}`}
                                      value={item.status}
                                      onValueChange={(nextValue) =>
                                        handleAttendanceStatusChange(
                                          item.studentId,
                                          nextValue as SessionAttendanceStatus,
                                        )
                                      }
                                      options={ATTENDANCE_STATUS_OPTIONS}
                                      buttonClassName="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                    />
                                  </label>

                                  {allowFinancialFields ? (
                                    <label className="flex flex-col gap-1 text-sm text-text-secondary">
                                      <span>Học phí buổi</span>
                                      <input
                                        name={`add-session-attendance-tuition-${item.studentId}`}
                                        type="number"
                                        min={0}
                                        value={item.tuitionFee}
                                        autoComplete="off"
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
                                  ) : null}

                                  <label className={`flex flex-col gap-1 text-sm text-text-secondary ${allowFinancialFields ? "sm:col-span-2" : ""}`}>
                                    <span>Ghi chú</span>
                                    <input
                                      name={`add-session-attendance-note-${item.studentId}`}
                                      value={item.notes}
                                      autoComplete="off"
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
                          <table className={`w-full border-collapse text-left text-sm ${allowFinancialFields ? "min-w-[840px]" : "min-w-[620px]"}`}>
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
                                {allowFinancialFields ? (
                                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                                    Học phí buổi
                                  </th>
                                ) : null}
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
                                    <UpgradedSelect
                                      name={`add-session-attendance-status-desktop-${item.studentId}`}
                                      value={item.status}
                                      onValueChange={(nextValue) =>
                                        handleAttendanceStatusChange(
                                          item.studentId,
                                          nextValue as SessionAttendanceStatus,
                                        )
                                      }
                                      options={ATTENDANCE_STATUS_OPTIONS}
                                      buttonClassName="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <input
                                      name={`add-session-attendance-note-desktop-${item.studentId}`}
                                      value={item.notes}
                                      autoComplete="off"
                                      onChange={(event) =>
                                        handleAttendanceNotesChange(item.studentId, event.target.value)
                                      }
                                      maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                                      className="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                      placeholder="Ghi chú điểm danh (nếu có)"
                                    />
                                  </td>
                                  {allowFinancialFields ? (
                                    <td className="px-4 py-3">
                                      <div className="space-y-1">
                                        <input
                                          name={`add-session-attendance-tuition-desktop-${item.studentId}`}
                                          type="number"
                                          min={0}
                                          value={item.tuitionFee}
                                          autoComplete="off"
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
                                  ) : null}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </div>

              <div className="mt-4 grid shrink-0 grid-cols-2 gap-2 border-t border-border-default pt-4 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createSessionMutation.isPending}
                  className="min-h-11 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
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
