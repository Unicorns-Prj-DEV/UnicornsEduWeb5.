"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SessionItem,
  SessionAttendanceStatus,
  SessionAttendanceItem,
} from "@/dtos/session.dto";
import { sanitizeHtml } from "@/lib/sanitize";
import RichTextEditor from "@/components/ui/RichTextEditor";
import * as sessionApi from "@/lib/apis/session.api";

type SessionEntityMode = "teacher" | "class" | "none";
type SessionStatusMode = "payment" | "timeline";

export type SessionTeacherOption = {
  id: string;
  fullName?: string | null;
};

type Props = {
  sessions: SessionItem[];
  entityMode?: SessionEntityMode;
  statusMode?: SessionStatusMode;
  emptyText?: string;
  className?: string;
  onSessionUpdated?: () => void;
  /** Danh sách gia sư (lớp) để chọn khi sửa buổi học. Truyền từ trang lớp. */
  teachers?: SessionTeacherOption[];
  /** Lấy danh sách gia sư theo lớp (dùng khi sửa từ trang gia sư). */
  getTeachersForClass?: (classId: string) => Promise<SessionTeacherOption[]>;
  /** Lấy danh sách học sinh của lớp để chỉnh sửa điểm danh. */
  getClassStudents?: (classId: string) => Promise<{ id: string; fullName: string }[]>;
};

type AttendanceFormItem = {
  studentId: string;
  fullName: string;
  status: SessionAttendanceStatus;
  notes: string;
};

const ATTENDANCE_STATUS_OPTIONS: Array<{ value: SessionAttendanceStatus; label: string }> = [
  { value: "present", label: "Học" },
  { value: "excused", label: "Phép" },
  { value: "absent", label: "Vắng" },
];

const MAX_ATTENDANCE_NOTES_LENGTH = 500;

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractDateKey(raw?: string | null): string | null {
  if (!raw) return null;

  const matched = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (matched) return matched[1];

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateKey(date);
}

function formatDateOnly(raw?: string | null): string {
  const dateKey = extractDateKey(raw);
  if (dateKey) {
    const [, year, month, day] = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

  return "—";
}

function formatTimeOnly(raw?: string | null): string {
  if (!raw) return "—";

  const directMatch = raw.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (directMatch) {
    return `${directMatch[1]}:${directMatch[2]}`;
  }

  const isoMatch = raw.trim().match(/T(\d{2}:\d{2})(?::\d{2})?/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function renderSessionTime(session: SessionItem): string {
  const start = formatTimeOnly(session.startTime ?? null);
  const end = formatTimeOnly(session.endTime ?? null);

  if (start === "—" && end === "—") {
    return "—";
  }

  if (start !== "—" && end !== "—") {
    return `${start} – ${end}`;
  }

  return start !== "—" ? start : end;
}

function renderSessionStatus(
  session: SessionItem,
  statusMode: SessionStatusMode,
): { label: string; className: string } {
  if (statusMode === "timeline") {
    const sessionDateKey = extractDateKey(session.date);
    if (!sessionDateKey) {
      return {
        label: "Chưa xác định",
        className: "bg-text-muted/15 text-text-muted",
      };
    }

    const todayDateKey = formatDateKey(new Date());
    if (sessionDateKey <= todayDateKey) {
      return {
        label: "Đã hoàn thành",
        className: "bg-success/15 text-success",
      };
    }

    return {
      label: "Đã lên lịch",
      className: "bg-warning/15 text-warning",
    };
  }

  const paymentStatus = (session.teacherPaymentStatus ?? "").toLowerCase();
  if (paymentStatus === "paid") {
    return {
      label: "Đã thanh toán",
      className: "bg-success/15 text-success",
    };
  }

  if (paymentStatus === "unpaid" || paymentStatus === "") {
    return {
      label: "Chưa thanh toán",
      className: "bg-warning/15 text-warning",
    };
  }

  return {
    label: paymentStatus,
    className: "bg-text-muted/15 text-text-muted",
  };
}

function renderEntityCell(session: SessionItem, entityMode: SessionEntityMode): string {
  if (entityMode === "teacher") {
    return session.teacher?.fullName?.trim() || "—";
  }

  if (entityMode === "class") {
    return session.class?.name?.trim() || "—";
  }

  return "—";
}

function renderEntityHeader(entityMode: SessionEntityMode): string {
  if (entityMode === "teacher") {
    return "Gia sư";
  }

  if (entityMode === "class") {
    return "Lớp";
  }

  return "";
}

/** YYYY-MM-DD for date input from session.date (ISO or date string). */
function toDateInputValue(raw?: string | null): string {
  const key = extractDateKey(raw);
  return key ?? "";
}

/** HH:mm or HH:mm:ss for time input from session start/end (ISO or time string). */
function toTimeInputValue(raw?: string | null): string {
  const t = formatTimeOnly(raw);
  if (t === "—") return "";
  return t.length === 5 ? t : `${t}:00`;
}

/** Normalize to HH:mm:ss for API. */
function normalizeTimeForApi(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return "";
  const [, h, m, s = "00"] = match;
  return `${h}:${m}:${s}`;
}

const PAYMENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
];

export default function SessionHistoryTable({
  sessions,
  entityMode = "none",
  statusMode = "payment",
  emptyText = "Chưa có buổi học nào.",
  className = "",
  onSessionUpdated,
  teachers: teachersProp,
  getTeachersForClass,
  getClassStudents,
}: Props) {
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("unpaid");
  const [editCoefficient, setEditCoefficient] = useState("");
  const [editAllowanceAmount, setEditAllowanceAmount] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [teachersList, setTeachersList] = useState<SessionTeacherOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [attendanceItems, setAttendanceItems] = useState<AttendanceFormItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    if (!editingSession) return;
    if (teachersProp?.length) {
      setTeachersList(teachersProp);
      setTeachersLoading(false);
      return;
    }
    if (getTeachersForClass && editingSession.classId) {
      setTeachersLoading(true);
      setTeachersList([]);
      getTeachersForClass(editingSession.classId)
        .then((list) => setTeachersList(list ?? []))
        .catch(() => setTeachersList([]))
        .finally(() => setTeachersLoading(false));
    } else {
      setTeachersList([]);
      setTeachersLoading(false);
    }
  }, [editingSession?.id, editingSession?.classId, teachersProp, getTeachersForClass]);

  useEffect(() => {
    if (!editingSession?.classId || !getClassStudents) {
      setAttendanceItems([]);
      setAttendanceLoading(false);
      return;
    }
    setAttendanceLoading(true);
    setAttendanceItems([]);
    const existingAttendance = editingSession.attendance ?? [];
    getClassStudents(editingSession.classId)
      .then((students) => {
        const byStudentId = new Map(
          existingAttendance.map((a) => [
            a.studentId,
            {
              status: (a.status ?? "absent") as SessionAttendanceStatus,
              notes: a.notes ?? "",
            },
          ]),
        );
        const merged: AttendanceFormItem[] = (students ?? []).map((s) => {
          const existing = byStudentId.get(s.id);
          return {
            studentId: s.id,
            fullName: s.fullName?.trim() || "—",
            status: existing?.status ?? "absent",
            notes: existing?.notes ?? "",
          };
        });
        setAttendanceItems(merged);
      })
      .catch(() => setAttendanceItems([]))
      .finally(() => setAttendanceLoading(false));
  }, [editingSession?.id, editingSession?.classId, editingSession?.attendance, getClassStudents]);

  const setAttendanceStatus = (studentId: string, status: SessionAttendanceStatus) => {
    setAttendanceItems((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, status } : item,
      ),
    );
  };

  const setAttendanceNotes = (studentId: string, notes: string) => {
    setAttendanceItems((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, notes } : item,
      ),
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => sessionApi.deleteSession(sessionId),
    onSuccess: () => {
      toast.success("Đã xóa buổi học.");
      onSessionUpdated?.();
    },
    onError: () => {
      toast.error("Không thể xóa buổi học. Vui lòng thử lại.");
    },
  });

  const handleDeleteClick = (session: SessionItem) => {
    const dateStr = formatDateOnly(session.date);
    const timeStr = renderSessionTime(session);
    if (window.confirm(`Bạn có chắc muốn xóa buổi học ${dateStr} ${timeStr !== "—" ? `(${timeStr})` : ""}? Hành động này không thể hoàn tác.`)) {
      deleteMutation.mutate(session.id);
    }
  };

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      date: string;
      teacherId?: string;
      startTime?: string;
      endTime?: string;
      notes: string | null;
      teacherPaymentStatus: string;
      coefficient?: number;
      allowanceAmount?: number | null;
      attendance?: SessionAttendanceItem[];
    }) => {
      const data: Parameters<typeof sessionApi.updateSession>[1] = {
        date: payload.date,
        notes: payload.notes,
        teacherPaymentStatus: payload.teacherPaymentStatus,
      };
      if (payload.teacherId) data.teacherId = payload.teacherId;
      if (payload.startTime) data.startTime = payload.startTime;
      if (payload.endTime) data.endTime = payload.endTime;
      if (payload.coefficient !== undefined) data.coefficient = payload.coefficient;
      if (payload.allowanceAmount !== undefined) data.allowanceAmount = payload.allowanceAmount;
      if (payload.attendance != null) {
        data.attendance = payload.attendance as SessionAttendanceItem[];
      }
      return sessionApi.updateSession(payload.id, data);
    },
    onSuccess: () => {
      toast.success("Đã cập nhật buổi học.");
      setEditingSession(null);
      onSessionUpdated?.();
    },
    onError: () => {
      toast.error("Không thể cập nhật buổi học. Vui lòng thử lại.");
    },
  });

  const openEdit = (session: SessionItem) => {
    setEditingSession(session);
    setEditDate(toDateInputValue(session.date));
    setEditStartTime(toTimeInputValue(session.startTime) || "18:00");
    setEditEndTime(toTimeInputValue(session.endTime) || "20:00");
    setEditNotes(session.notes ?? "");
    setEditTeacherId(session.teacherId ?? "");
    const status = (session.teacherPaymentStatus ?? "unpaid").toLowerCase();
    setEditPaymentStatus(status === "paid" ? "paid" : "unpaid");
    const coeff = session.coefficient;
    setEditCoefficient(
      coeff != null && Number.isFinite(Number(coeff)) ? String(coeff) : "1",
    );
    const allowance = session.allowanceAmount;
    setEditAllowanceAmount(
      allowance != null && Number.isFinite(Number(allowance)) ? String(allowance) : "",
    );
  };

  const closeEdit = () => {
    setEditingSession(null);
  };

  const handleSaveEdit = () => {
    if (!editingSession) return;
    const startNorm = normalizeTimeForApi(editStartTime);
    const endNorm = normalizeTimeForApi(editEndTime);
    if (startNorm && endNorm) {
      const toSeconds = (hhmmss: string) => {
        const [h, m, s] = hhmmss.split(":").map(Number);
        return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
      };
      if (toSeconds(endNorm) <= toSeconds(startNorm)) {
        toast.error("Giờ kết thúc phải lớn hơn giờ bắt đầu.");
        return;
      }
    }
    if (!editDate.trim()) {
      toast.error("Vui lòng chọn ngày học.");
      return;
    }
    if (teachersList.length > 0 && !editTeacherId.trim()) {
      toast.error("Vui lòng chọn gia sư phụ trách.");
      return;
    }
    const hasAttendanceNotesTooLong = attendanceItems.some(
      (item) => item.notes.length > MAX_ATTENDANCE_NOTES_LENGTH,
    );
    if (hasAttendanceNotesTooLong) {
      toast.error(`Ghi chú điểm danh tối đa ${MAX_ATTENDANCE_NOTES_LENGTH} ký tự.`);
      return;
    }
    const attendancePayload: SessionAttendanceItem[] =
      attendanceItems.length > 0
        ? attendanceItems.map((item) => ({
          studentId: item.studentId,
          status: item.status,
          notes: item.notes.trim() || null,
        }))
        : [];
    const coeffNum = editCoefficient.trim() ? Number(editCoefficient) : undefined;
    const allowanceNum = editAllowanceAmount.trim()
      ? Math.floor(Number(editAllowanceAmount))
      : undefined;
    const validCoeff =
      coeffNum !== undefined &&
      Number.isFinite(coeffNum) &&
      coeffNum >= 0.1 &&
      coeffNum <= 9.9;

    updateMutation.mutate({
      id: editingSession.id,
      date: editDate.trim(),
      ...(editTeacherId && teachersList.length > 0 && { teacherId: editTeacherId }),
      ...(startNorm && { startTime: startNorm }),
      ...(endNorm && { endTime: endNorm }),
      notes: editNotes.trim() || null,
      teacherPaymentStatus: editPaymentStatus,
      ...(validCoeff && { coefficient: coeffNum }),
      ...(allowanceNum !== undefined && Number.isFinite(allowanceNum) && allowanceNum >= 0
        ? { allowanceAmount: allowanceNum }
        : editAllowanceAmount.trim() === ""
          ? { allowanceAmount: null }
          : {}),
      ...(attendancePayload.length > 0 && { attendance: attendancePayload }),
    });
  };

  const shouldShowEntity = entityMode !== "none";

  return (
    <>
      {/* Mobile layout: card list */}
      <div className={`space-y-3 ${className} md:hidden`}>
        {sessions.length > 0 ? (
          sessions.map((session) => {
            const status = renderSessionStatus(session, statusMode);
            const notesContent = session.notes?.trim();
            const sanitizedNotes = notesContent ? sanitizeHtml(notesContent) : "";
            const entityLabel = shouldShowEntity ? renderEntityHeader(entityMode) : "";
            const entityValue = shouldShowEntity ? renderEntityCell(session, entityMode) : "";

            return (
              <article
                key={session.id}
                className="group rounded-lg border border-border-default bg-bg-surface p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Ngày học
                    </p>
                    <p className="text-sm font-semibold text-text-primary">
                      {formatDateOnly(session.date)}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                      Giờ học
                    </p>
                    <p className="text-sm font-mono text-text-primary">
                      {renderSessionTime(session)}
                    </p>
                    {shouldShowEntity && (
                      <div className="mt-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                          {entityLabel}
                        </p>
                        <p
                          className="max-w-[200px] truncate text-sm text-text-primary"
                          title={entityValue}
                        >
                          {entityValue}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                    {onSessionUpdated && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(session)}
                          aria-label="Chỉnh sửa buổi học"
                          className="rounded p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          <svg
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(session)}
                          disabled={deleteMutation.isPending}
                          aria-label="Xóa buổi học"
                          className="rounded p-1.5 text-text-muted transition-colors hover:bg-error/10 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
                        >
                          <svg
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {entityMode === "teacher" && (
                  <div className="mt-3 border-t border-border-subtle pt-2">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                      Ghi chú
                    </p>
                    {sanitizedNotes ? (
                      <div
                        className="prose prose-xs max-w-none text-sm text-text-primary [&_p]:mb-1 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-bold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizedNotes }}
                      />
                    ) : (
                      <p className="text-sm text-text-muted">Không có ghi chú.</p>
                    )}
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <p className="text-center text-sm text-text-muted">{emptyText}</p>
        )}
      </div>

      {/* Desktop / tablet layout: table */}
      <div className={`hidden overflow-x-auto md:block ${className}`}>
        <table
          className={
            entityMode === "class"
              ? "w-full min-w-[400px] table-fixed border-collapse text-left text-sm"
              : "w-full min-w-[520px] border-collapse text-left text-sm"
          }
        >
          <caption className="sr-only">Lịch sử buổi học</caption>
          <colgroup>
            {entityMode === "teacher" ? (
              <>
                <col className="w-[10%]" />
                <col className="w-[28%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                {onSessionUpdated && <col className="w-[12%]" />}
              </>
            ) : shouldShowEntity ? (
              <>
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[36%]" />
                <col className="w-[20%]" />
                {onSessionUpdated && <col className="w-[12%]" />}
              </>
            ) : (
              <>
                <col className="w-[25%]" />
                <col className="w-[25%]" />
                <col className="w-[38%]" />
                {onSessionUpdated && <col className="w-[12%]" />}
              </>
            )}
          </colgroup>
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                Ngày học
              </th>
              {entityMode === "teacher" ? (
                <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                  Note
                </th>
              ) : null}
              <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                Giờ học
              </th>
              {shouldShowEntity ? (
                <th scope="col" className="min-w-0 px-4 py-3 font-medium text-text-primary">
                  {renderEntityHeader(entityMode)}
                </th>
              ) : null}
              <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                Trạng thái thanh toán
              </th>
              {onSessionUpdated ? (
                <th
                  scope="col"
                  className="w-20 px-2 py-3 text-right font-medium text-text-primary"
                  title="Thao tác"
                >
                  <span className="sr-only">Thao tác</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sessions.length > 0 ? (
              sessions.map((session) => {
                const status = renderSessionStatus(session, statusMode);
                const notesContent = session.notes?.trim();
                const sanitizedNotes = notesContent ? sanitizeHtml(notesContent) : "";
                return (
                  <tr
                    key={session.id}
                    className="group border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                  >
                    <td className="px-4 py-3 text-text-primary">
                      {formatDateOnly(session.date)}
                    </td>
                    {entityMode === "teacher" ? (
                      <td className="px-4 py-3 text-text-primary">
                        {sanitizedNotes ? (
                          <div
                            className="min-w-0 [&_p]:mb-1 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-bold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                            dangerouslySetInnerHTML={{ __html: sanitizedNotes }}
                          />
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 font-mono text-text-primary">
                      {renderSessionTime(session)}
                    </td>
                    {shouldShowEntity ? (
                      <td className="min-w-0 px-4 py-3 text-text-primary">
                        <span
                          className="block truncate"
                          title={renderEntityCell(session, entityMode)}
                        >
                          {renderEntityCell(session, entityMode)}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    {onSessionUpdated ? (
                      <td className="px-2 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(session)}
                            aria-label="Chỉnh sửa buổi học"
                            className="rounded p-1.5 text-text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-bg-tertiary hover:text-primary focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            <svg
                              className="size-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(session)}
                            disabled={deleteMutation.isPending}
                            aria-label="Xóa buổi học"
                            className="rounded p-1.5 text-text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-error/10 hover:text-error focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
                          >
                            <svg
                              className="size-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={
                    (entityMode === "teacher" ? 5 : shouldShowEntity ? 4 : 3) +
                    (onSessionUpdated ? 1 : 0)
                  }
                  className="px-4 py-3 text-center text-text-muted"
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingSession && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden
            onClick={closeEdit}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-title"
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 id="edit-session-title" className="text-lg font-semibold text-text-primary">
                Chỉnh sửa buổi học
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Đóng"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Ngày học</span>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
                {(teachersList.length > 0 || teachersLoading) ? (
                  <label className="flex flex-col gap-1 text-sm text-text-secondary">
                    <span>Gia sư phụ trách</span>
                    <select
                      value={editTeacherId}
                      onChange={(e) => setEditTeacherId(e.target.value)}
                      disabled={teachersLoading}
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
                    >
                      {teachersLoading ? (
                        <option value="">Đang tải…</option>
                      ) : (
                        <>
                          <option value="">Chọn gia sư</option>
                          {teachersList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.fullName?.trim() || "Gia sư"}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>
                ) : null}
                <label className="col-span-2 flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Trạng thái thanh toán</span>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => setEditPaymentStatus(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {PAYMENT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Giờ bắt đầu</span>
                  <input
                    type="time"
                    step={1}
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Giờ kết thúc</span>
                  <input
                    type="time"
                    step={1}
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Hệ số (coefficient)</span>
                  <input
                    type="number"
                    min={0.1}
                    max={9.9}
                    step={0.1}
                    value={editCoefficient}
                    onChange={(e) => setEditCoefficient(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Trợ cấp buổi (VNĐ)</span>
                  <input
                    type="number"
                    min={0}
                    value={editAllowanceAmount}
                    onChange={(e) => setEditAllowanceAmount(e.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="Để trống = giữ nguyên"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Ghi chú buổi học</span>
                <RichTextEditor
                  value={editNotes}
                  onChange={setEditNotes}
                  minHeight="min-h-[180px]"
                />
              </label>

              {getClassStudents ? (
                <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
                    Điểm danh học sinh
                  </h3>
                  {attendanceLoading ? (
                    <p className="py-4 text-center text-sm text-text-muted">Đang tải…</p>
                  ) : attendanceItems.length === 0 ? (
                    <p className="py-4 text-center text-sm text-text-muted">Lớp chưa có học sinh.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border-default bg-bg-surface">
                      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                        <caption className="sr-only">Điểm danh học sinh</caption>
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
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceItems.map((item) => (
                            <tr
                              key={item.studentId}
                              className="border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary"
                            >
                              <td className="px-4 py-3 text-text-primary">{item.fullName}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={item.status}
                                  onChange={(e) =>
                                    setAttendanceStatus(
                                      item.studentId,
                                      e.target.value as SessionAttendanceStatus,
                                    )
                                  }
                                  className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                >
                                  {ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={item.notes}
                                  onChange={(e) => setAttendanceNotes(item.studentId, e.target.value)}
                                  maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                                  className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                  placeholder="Ghi chú (nếu có)"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ) : null}
            </div>
            <div className="mt-4 flex shrink-0 justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              >
                {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}