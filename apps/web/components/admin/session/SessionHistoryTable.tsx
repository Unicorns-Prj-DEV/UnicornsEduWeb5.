"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SessionItem,
  SessionAttendanceStatus,
  SessionAttendanceItem,
  SessionUpdatePayload,
} from "@/dtos/session.dto";
import { ClassDetail } from "@/dtos/class.dto";
import { sanitizeHtml } from "@/lib/sanitize";
import { formatCurrency } from "@/lib/class.helpers";
import RichTextEditor from "@/components/ui/RichTextEditor";
import * as classApi from "@/lib/apis/class.api";
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
  editorLayout?: "default" | "wide";
  showActionsColumn?: boolean;
  sessionTuitionTotal?: number;
  onSessionUpdated?: () => void;
  /** Danh sách gia sư (lớp) để chọn khi sửa buổi học. Truyền từ trang lớp. */
  teachers?: SessionTeacherOption[];
  /** Lấy danh sách gia sư theo lớp (dùng khi sửa từ trang gia sư). */
  getTeachersForClass?: (classId: string) => Promise<SessionTeacherOption[]>;
  /** Lấy danh sách học sinh của lớp để chỉnh sửa điểm danh. */
  getClassStudents?: (
    classId: string,
  ) => Promise<{ id: string; fullName: string; tuitionFee?: number | null }[]>;
  allowTeacherSelection?: boolean;
  allowFinancialEdits?: boolean;
  allowPaymentStatusEdit?: boolean;
  allowDeleteSession?: boolean;
  updateSessionFn?: (id: string, data: SessionUpdatePayload) => Promise<SessionItem>;
  deleteSessionFn?: (id: string) => Promise<void>;
};

type AttendanceFormItem = {
  studentId: string;
  fullName: string;
  status: SessionAttendanceStatus;
  notes: string;
  tuitionFee: string;
  defaultTuitionFee: number | null;
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

function resolveSessionTuitionFee(session: SessionItem): number {
  const sessionTuitionRaw =
    typeof session.tuitionFee === "number" ? session.tuitionFee : Number(session.tuitionFee);
  if (Number.isFinite(sessionTuitionRaw)) {
    return sessionTuitionRaw;
  }

  if (!Array.isArray(session.attendance)) {
    return 0;
  }

  return session.attendance.reduce((sum, item) => {
    const tuitionRaw =
      typeof item.tuitionFee === "number" ? item.tuitionFee : Number(item.tuitionFee ?? 0);
    return sum + (Number.isFinite(tuitionRaw) ? tuitionRaw : 0);
  }, 0);
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
  editorLayout = "default",
  showActionsColumn: showActionsColumnProp,
  sessionTuitionTotal,
  onSessionUpdated,
  teachers: teachersProp,
  getTeachersForClass,
  getClassStudents,
  allowTeacherSelection = true,
  allowFinancialEdits = true,
  allowPaymentStatusEdit = true,
  allowDeleteSession = true,
  updateSessionFn = sessionApi.updateSession,
  deleteSessionFn = sessionApi.deleteSession,
}: Props) {
  const isWideEditor = editorLayout === "wide";
  const showActionsColumn = showActionsColumnProp ?? Boolean(onSessionUpdated);
  const showDeleteAction = showActionsColumn && allowDeleteSession;
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
  const showTeacherInput = allowTeacherSelection && (teachersList.length > 0 || teachersLoading);
  const editingClassId = editingSession?.classId ?? "";
  const {
    data: editingClassDetail,
    isLoading: isEditingClassDetailLoading,
    isError: isEditingClassDetailError,
  } = useQuery<ClassDetail>({
    queryKey: ["class", "detail", "session-edit", editingClassId],
    queryFn: () => classApi.getClassById(editingClassId),
    enabled: !!editingClassId && allowFinancialEdits,
  });

  const loadTeachersForEdit = (session: SessionItem) => {
    if (teachersProp?.length) {
      setTeachersList(teachersProp);
      setTeachersLoading(false);
      return;
    }

    if (getTeachersForClass && session.classId) {
      setTeachersLoading(true);
      setTeachersList([]);
      void getTeachersForClass(session.classId)
        .then((list) => setTeachersList(list ?? []))
        .catch(() => setTeachersList([]))
        .finally(() => setTeachersLoading(false));
      return;
    }

    setTeachersList([]);
    setTeachersLoading(false);
  };

  const loadAttendanceForEdit = (session: SessionItem) => {
    if (!session.classId || !getClassStudents) {
      setAttendanceItems([]);
      setAttendanceLoading(false);
      return;
    }

    setAttendanceLoading(true);
    setAttendanceItems([]);
    const existingAttendance = session.attendance ?? [];
    void getClassStudents(session.classId)
      .then((students) => {
        const byStudentId = new Map(
          existingAttendance.map((attendanceItem) => [
            attendanceItem.studentId,
            {
              status: (attendanceItem.status ?? "absent") as SessionAttendanceStatus,
              notes: attendanceItem.notes ?? "",
              tuitionFee: normalizeMoneyValue(attendanceItem.tuitionFee) ?? null,
            },
          ]),
        );
        const merged: AttendanceFormItem[] = (students ?? []).map((student) => {
          const existing = byStudentId.get(student.id);
          const defaultTuitionFee = normalizeMoneyValue(student.tuitionFee);
          const existingTuitionFee = normalizeMoneyValue(existing?.tuitionFee);
          const shouldShowOverride =
            existingTuitionFee != null &&
            (defaultTuitionFee == null || existingTuitionFee !== defaultTuitionFee);

          return {
            studentId: student.id,
            fullName: student.fullName?.trim() || "—",
            status: existing?.status ?? "absent",
            notes: existing?.notes ?? "",
            tuitionFee:
              shouldShowOverride && existingTuitionFee != null
                ? String(existingTuitionFee)
                : "",
            defaultTuitionFee,
          };
        });

        setAttendanceItems(merged);
      })
      .catch(() => setAttendanceItems([]))
      .finally(() => setAttendanceLoading(false));
  };

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

  const setAttendanceTuitionFee = (studentId: string, tuitionFee: string) => {
    setAttendanceItems((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, tuitionFee } : item,
      ),
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSessionFn(sessionId),
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
      teacherPaymentStatus?: string;
      coefficient?: number;
      allowanceAmount?: number | null;
      attendance?: SessionAttendanceItem[];
    }) => {
      const data: Parameters<typeof sessionApi.updateSession>[1] = {
        date: payload.date,
        notes: payload.notes,
      };
      if (payload.teacherPaymentStatus !== undefined) {
        data.teacherPaymentStatus = payload.teacherPaymentStatus;
      }
      if (payload.teacherId) data.teacherId = payload.teacherId;
      if (payload.startTime) data.startTime = payload.startTime;
      if (payload.endTime) data.endTime = payload.endTime;
      if (payload.coefficient !== undefined) data.coefficient = payload.coefficient;
      if (payload.allowanceAmount !== undefined) data.allowanceAmount = payload.allowanceAmount;
      if (payload.attendance != null) {
        data.attendance = payload.attendance as SessionAttendanceItem[];
      }
      return updateSessionFn(payload.id, data);
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
    loadTeachersForEdit(session);
    loadAttendanceForEdit(session);
  };

  const closeEdit = () => {
    setEditingSession(null);
    setTeachersList([]);
    setTeachersLoading(false);
    setAttendanceItems([]);
    setAttendanceLoading(false);
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
    if (showTeacherInput && !editTeacherId.trim()) {
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
    const hasInvalidAttendanceTuition =
      allowFinancialEdits &&
      attendanceItems.some((item) => !isNonNegativeMoneyInput(item.tuitionFee));
    if (hasInvalidAttendanceTuition) {
      toast.error("Học phí từng học sinh phải là số không âm.");
      return;
    }
    const attendancePayload: SessionAttendanceItem[] =
      attendanceItems.length > 0
        ? attendanceItems.map((item) => ({
          studentId: item.studentId,
          status: item.status,
          notes: item.notes.trim() || null,
          ...(allowFinancialEdits && item.tuitionFee.trim() !== ""
            ? { tuitionFee: Math.floor(Number(item.tuitionFee)) }
            : {}),
        }))
        : [];
    const coeffNum =
      allowFinancialEdits && editCoefficient.trim() ? Number(editCoefficient) : undefined;
    const allowanceNum =
      allowFinancialEdits && editAllowanceAmount.trim()
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
      ...(allowTeacherSelection &&
        editTeacherId &&
        teachersList.length > 0 && { teacherId: editTeacherId }),
      ...(startNorm && { startTime: startNorm }),
      ...(endNorm && { endTime: endNorm }),
      notes: editNotes.trim() || null,
      ...(allowPaymentStatusEdit ? { teacherPaymentStatus: editPaymentStatus } : {}),
      ...(allowFinancialEdits && validCoeff ? { coefficient: coeffNum } : {}),
      ...(allowFinancialEdits &&
        allowanceNum !== undefined &&
        Number.isFinite(allowanceNum) &&
        allowanceNum >= 0
        ? { allowanceAmount: allowanceNum }
        : {}),
      ...(attendancePayload.length > 0 && { attendance: attendancePayload }),
    });
  };

  const shouldShowEntity = entityMode !== "none";
  const resolvedEditSessionTuition =
    editingSession == null
      ? sessionTuitionTotal ?? 0
      : attendanceItems.length > 0
        ? attendanceItems.reduce((sum, item) => sum + resolveAttendanceTuitionValue(item), 0)
        : editingSession.tuitionFee != null || Array.isArray(editingSession.attendance)
          ? resolveSessionTuitionFee(editingSession)
          : sessionTuitionTotal ?? 0;
  const attendanceDefaultTuitionTotal = useMemo(
    () =>
      attendanceItems.reduce(
        (sum, item) => sum + (normalizeMoneyValue(item.defaultTuitionFee) ?? 0),
        0,
      ),
    [attendanceItems],
  );
  const attendanceSummary = useMemo(
    () =>
      attendanceItems.reduce(
        (acc, item) => ({
          ...acc,
          [item.status]: acc[item.status] + 1,
        }),
        {
          present: 0,
          excused: 0,
          absent: 0,
        },
      ),
    [attendanceItems],
  );
  const attendanceOverrideCount = useMemo(
    () => attendanceItems.filter((item) => item.tuitionFee.trim() !== "").length,
    [attendanceItems],
  );
  const currentSessionCoefficient =
    editingSession?.coefficient != null && Number.isFinite(Number(editingSession.coefficient))
      ? Number(editingSession.coefficient)
      : 1;
  const coefficientInput = editCoefficient.trim();
  const coefficientInputValue =
    coefficientInput === "" ? null : Number(editCoefficient);
  const isCoefficientInputValid =
    coefficientInputValue != null &&
    Number.isFinite(coefficientInputValue) &&
    coefficientInputValue >= 0.1 &&
    coefficientInputValue <= 9.9;
  const previewCoefficient =
    coefficientInput === ""
      ? currentSessionCoefficient
      : isCoefficientInputValid
        ? coefficientInputValue
        : null;
  const selectedTeacherId = editTeacherId.trim() || editingSession?.teacherId || "";
  const selectedTeacherCustomAllowance =
    editingClassDetail?.teachers?.find((teacher) => teacher.id === selectedTeacherId)
      ?.customAllowance ?? null;
  const classDefaultAllowance = normalizeMoneyValue(
    editingClassDetail?.allowancePerSessionPerStudent,
  );
  const fallbackTeacherAllowance =
    normalizeMoneyValue(selectedTeacherCustomAllowance) ?? classDefaultAllowance;
  const currentSessionAllowance = normalizeMoneyValue(editingSession?.allowanceAmount);
  const allowanceInput = editAllowanceAmount.trim();
  const allowanceInputValue =
    allowanceInput === "" ? null : Number(editAllowanceAmount);
  const isAllowanceInputValid =
    allowanceInputValue != null &&
    Number.isFinite(allowanceInputValue) &&
    allowanceInputValue >= 0;
  const previewAllowanceAmount =
    allowanceInput === ""
      ? selectedTeacherId !== (editingSession?.teacherId ?? "")
        ? fallbackTeacherAllowance
        : currentSessionAllowance ?? fallbackTeacherAllowance
      : isAllowanceInputValid
        ? Math.floor(allowanceInputValue)
        : null;
  const simpleAllowancePreview =
    previewCoefficient != null && previewAllowanceAmount != null
      ? previewCoefficient * previewAllowanceAmount
      : null;
  const shouldWaitForClassFormula =
    !!editingSession &&
    (isEditingClassDetailLoading ||
      (!editingClassDetail && !isEditingClassDetailError));
  const hasPreviewValidationIssue =
    (coefficientInput !== "" && !isCoefficientInputValid) ||
    (allowanceInput !== "" && !isAllowanceInputValid);
  const allowanceFormulaNote = isEditingClassDetailError
    ? "Công thức trợ cấp: không tải được cấu hình lớp để preview."
    : shouldWaitForClassFormula
      ? "Công thức trợ cấp: đang tải cấu hình lớp..."
      : hasPreviewValidationIssue
        ? "Công thức trợ cấp: nhập hệ số từ 0.1 đến 9.9 và trợ cấp không âm để xem preview."
        : simpleAllowancePreview == null
          ? "Công thức trợ cấp: chưa đủ dữ liệu để tính."
          : `Preview trợ cấp cơ bản: ${formatCurrency(previewAllowanceAmount)} × ${previewCoefficient?.toFixed(1) ?? "?"} = ${formatCurrency(simpleAllowancePreview)}.`;

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
                    {showActionsColumn && (
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
                        {showDeleteAction ? (
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
                        ) : null}
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
                {showActionsColumn && <col className="w-[12%]" />}
              </>
            ) : shouldShowEntity ? (
              <>
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[36%]" />
                <col className="w-[20%]" />
                {showActionsColumn && <col className="w-[12%]" />}
              </>
            ) : (
              <>
                <col className="w-[25%]" />
                <col className="w-[25%]" />
                <col className="w-[38%]" />
                {showActionsColumn && <col className="w-[12%]" />}
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
                {statusMode === "timeline" ? "Tiến độ" : "Trạng thái thanh toán"}
              </th>
              {showActionsColumn ? (
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
                    {showActionsColumn ? (
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
                          {showDeleteAction ? (
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
                          ) : null}
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
                    (showActionsColumn ? 1 : 0)
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
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            aria-hidden
            onClick={closeEdit}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto p-2 sm:p-4">
            <div
              className={`mx-auto flex min-h-full w-full items-start py-2 sm:items-center sm:py-0 ${isWideEditor ? "max-w-[72rem]" : "max-w-2xl"
                }`}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-session-title"
                className="my-auto flex max-h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-border-default bg-bg-surface p-3 shadow-2xl  sm:max-h-[calc(100dvh-2rem)] sm:p-5"
              >
                <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-border-default/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 id="edit-session-title" className="text-lg font-semibold text-text-primary">
                      Chỉnh sửa buổi học
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      {allowFinancialEdits || allowPaymentStatusEdit || allowTeacherSelection
                        ? "Cập nhật thời gian, cấu hình và điểm danh trong cùng một biểu mẫu."
                        : "Cập nhật ngày học, giờ học, ghi chú và điểm danh trong cùng một biểu mẫu."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-2 sm:justify-end">
                    {allowFinancialEdits ? (
                      <div className="rounded-[1.15rem] border border-primary/15 bg-primary/5 px-3.5 py-2 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                          Tổng học phí buổi này
                        </p>
                        <p className="mt-1 text-right text-sm font-semibold tabular-nums text-primary sm:text-base">
                          {formatCurrency(resolvedEditSessionTuition)}
                        </p>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={closeEdit}
                      className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label="Đóng"
                    >
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

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

                      <div className={`grid gap-4 sm:grid-cols-2 ${isWideEditor ? "xl:grid-cols-6" : ""}`}>
                        <label className={`flex flex-col gap-1 text-sm text-text-secondary ${isWideEditor ? "xl:col-span-2" : ""}`}>
                          <span>Ngày học</span>
                          <input
                            name="edit-session-date"
                            type="date"
                            value={editDate}
                            autoComplete="off"
                            onChange={(e) => setEditDate(e.target.value)}
                            className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          />
                        </label>

                        {showTeacherInput ? (
                          <label className={`flex flex-col gap-1 text-sm text-text-secondary ${isWideEditor ? "xl:col-span-2" : ""}`}>
                            <span>Gia sư phụ trách</span>
                            <select
                              name="edit-session-teacher"
                              value={editTeacherId}
                              onChange={(e) => setEditTeacherId(e.target.value)}
                              disabled={teachersLoading}
                              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
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

                        {allowPaymentStatusEdit ? (
                          <label
                            className={`flex flex-col gap-1 text-sm text-text-secondary ${isWideEditor ? "sm:col-span-2 xl:col-span-2" : "sm:col-span-2"
                              }`}
                          >
                            <span>Trạng thái thanh toán</span>
                            <select
                              name="edit-session-payment-status"
                              value={editPaymentStatus}
                              onChange={(e) => setEditPaymentStatus(e.target.value)}
                              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            >
                              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}

                        <label className="flex flex-col gap-1 text-sm text-text-secondary">
                          <span>Giờ bắt đầu</span>
                          <input
                            name="edit-session-start-time"
                            type="time"
                            step={1}
                            value={editStartTime}
                            autoComplete="off"
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-sm text-text-secondary">
                          <span>Giờ kết thúc</span>
                          <input
                            name="edit-session-end-time"
                            type="time"
                            step={1}
                            value={editEndTime}
                            autoComplete="off"
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          />
                        </label>

                        {allowFinancialEdits ? (
                          <>
                            <label className={`flex flex-col gap-1 text-sm text-text-secondary ${isWideEditor ? "xl:col-span-2" : ""}`}>
                              <span>Hệ số (coefficient)</span>
                              <input
                                name="edit-session-coefficient"
                                type="number"
                                min={0.1}
                                max={9.9}
                                step={0.1}
                                value={editCoefficient}
                                autoComplete="off"
                                onChange={(e) => setEditCoefficient(e.target.value)}
                                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                placeholder="1"
                              />
                            </label>

                            <label className={`flex flex-col gap-1 text-sm text-text-secondary ${isWideEditor ? "xl:col-span-2" : ""}`}>
                              <span>Trợ cấp buổi (VNĐ)</span>
                              <input
                                name="edit-session-allowance"
                                type="number"
                                min={0}
                                value={editAllowanceAmount}
                                autoComplete="off"
                                onChange={(e) => setEditAllowanceAmount(e.target.value)}
                                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                placeholder="Để trống = giữ nguyên"
                              />
                            </label>

                            <p
                              className={`rounded-2xl border border-border-default/80 bg-bg-surface px-3 py-2 text-xs ${isWideEditor ? "sm:col-span-2 xl:col-span-6" : "sm:col-span-2"
                                } ${isEditingClassDetailError || hasPreviewValidationIssue
                                  ? "text-warning"
                                  : "text-text-muted"
                                }`}
                            >
                              {allowanceFormulaNote}
                            </p>
                          </>
                        ) : null}

                        <label
                          className={`flex flex-col gap-1 text-sm text-text-secondary ${isWideEditor ? "sm:col-span-2 xl:col-span-6" : "sm:col-span-2"
                            }`}
                        >
                          <span>Ghi chú buổi học</span>
                          <RichTextEditor
                            value={editNotes}
                            onChange={setEditNotes}
                            minHeight="min-h-[180px]"
                          />
                        </label>
                      </div>
                    </section>

                    {getClassStudents ? (
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
                            <div className={`flex gap-2 flex-col`}>
                              <div className="flex flex-row gap-2 justify-between">
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
                              {allowFinancialEdits ? (
                                <div className="flex flex-row gap-2 justify-between">
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
                                      {formatCurrency(resolvedEditSessionTuition)}
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

                        {attendanceLoading ? (
                          <p className="py-4 text-center text-sm text-text-muted">Đang tải…</p>
                        ) : attendanceItems.length === 0 ? (
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
                                        {allowFinancialEdits ? (
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

                                    <div className={`mt-4 grid gap-3 ${allowFinancialEdits ? "sm:grid-cols-2" : ""}`}>
                                      <label className="flex flex-col gap-1 text-sm text-text-secondary">
                                        <span>Trạng thái</span>
                                        <select
                                          name={`edit-session-attendance-status-${item.studentId}`}
                                          value={item.status}
                                          onChange={(e) =>
                                            setAttendanceStatus(
                                              item.studentId,
                                              e.target.value as SessionAttendanceStatus,
                                            )
                                          }
                                          className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                        >
                                          {ATTENDANCE_STATUS_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>

                                      {allowFinancialEdits ? (
                                        <label className="flex flex-col gap-1 text-sm text-text-secondary">
                                          <span>Học phí buổi</span>
                                          <input
                                            name={`edit-session-attendance-tuition-${item.studentId}`}
                                            type="number"
                                            min={0}
                                            value={item.tuitionFee}
                                            autoComplete="off"
                                            onChange={(e) => setAttendanceTuitionFee(item.studentId, e.target.value)}
                                            className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                            placeholder={
                                              item.defaultTuitionFee != null
                                                ? String(item.defaultTuitionFee)
                                                : "Theo học sinh"
                                            }
                                          />
                                        </label>
                                      ) : null}

                                      <label className={`flex flex-col gap-1 text-sm text-text-secondary ${allowFinancialEdits ? "sm:col-span-2" : ""}`}>
                                        <span>Ghi chú</span>
                                        <input
                                          name={`edit-session-attendance-note-${item.studentId}`}
                                          type="text"
                                          value={item.notes}
                                          autoComplete="off"
                                          onChange={(e) => setAttendanceNotes(item.studentId, e.target.value)}
                                          maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                                          className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                          placeholder="Ghi chú (nếu có)"
                                        />
                                      </label>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>

                            <div className="hidden overflow-x-auto rounded-[1.25rem] border border-border-default bg-bg-surface lg:block">
                              <table className={`w-full border-collapse text-left text-sm ${allowFinancialEdits ? "min-w-[840px]" : "min-w-[620px]"}`}>
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
                                    {allowFinancialEdits ? (
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
                                      className="border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary"
                                    >
                                      <td className="px-4 py-3 text-text-primary">{item.fullName}</td>
                                      <td className="px-4 py-3">
                                        <select
                                          name={`edit-session-attendance-status-desktop-${item.studentId}`}
                                          value={item.status}
                                          onChange={(e) =>
                                            setAttendanceStatus(
                                              item.studentId,
                                              e.target.value as SessionAttendanceStatus,
                                            )
                                          }
                                          className="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                                          name={`edit-session-attendance-note-desktop-${item.studentId}`}
                                          type="text"
                                          value={item.notes}
                                          autoComplete="off"
                                          onChange={(e) => setAttendanceNotes(item.studentId, e.target.value)}
                                          maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                                          className="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                          placeholder="Ghi chú (nếu có)"
                                        />
                                      </td>
                                      {allowFinancialEdits ? (
                                        <td className="px-4 py-3">
                                          <div className="space-y-1">
                                            <input
                                              name={`edit-session-attendance-tuition-desktop-${item.studentId}`}
                                              type="number"
                                              min={0}
                                              value={item.tuitionFee}
                                              autoComplete="off"
                                              onChange={(e) => setAttendanceTuitionFee(item.studentId, e.target.value)}
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
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid shrink-0 grid-cols-2 gap-2 border-t border-border-default pt-4 sm:flex sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                    className="min-h-11 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
