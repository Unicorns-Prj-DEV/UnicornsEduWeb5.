"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SessionAttendanceItem,
  SessionAttendanceStatus,
  SessionCreatePayload,
  SessionItem,
} from "@/dtos/session.dto";
import { getFullProfile } from "@/lib/apis/auth.api";
import * as sessionApi from "@/lib/apis/session.api";
import { formatCurrency } from "@/lib/class.helpers";
import {
  AttendanceInlineSummary,
  AttendanceStatusQuickPick,
  formatVnSessionDuration,
  RequiredMark,
  SessionFormDialogHeader,
} from "@/components/admin/session/session-form-ui";
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

/** Dữ liệu lớp để ước lượng trợ cấp (công thức đồng bộ docs income-summary). */
export type SessionClassPricingContext = {
  allowancePerSessionPerStudent: number;
  maxAllowancePerSession?: number | null;
  scaleAmount?: number | null;
  teacherCustomAllowanceByTeacherId?: Record<string, number | null | undefined>;
};

type Props = {
  open: boolean;
  classId: string;
  defaultTeacherId?: string;
  teachers?: SessionTeacherItem[];
  students: SessionStudentItem[];
  sessionTuitionTotal?: number;
  /** Khi có, hiển thị tổng trợ cấp dự kiến ở header + khối phân tích */
  classPricing?: SessionClassPricingContext;
  teacherMode?: SessionTeacherMode;
  allowFinancialFields?: boolean;
  allowCoefficientField?: boolean;
  allowAllowanceField?: boolean;
  allowAttendanceTuitionEdits?: boolean;
  createSessionFn?: (payload: SessionCreatePayload) => Promise<SessionItem>;
  onClose: () => void;
  onCreated?: (session: SessionItem) => void;
};

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
function toAttendancePayload(
  items: AttendanceFormItem[],
  includeTuition: boolean,
): SessionAttendanceItem[] {
  return items.map((item) => ({
    studentId: item.studentId,
    status: item.status,
    notes: item.notes.trim() || null,
    ...(includeTuition && item.tuitionFee.trim() !== ""
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

function isChargeableAttendanceStatus(status: SessionAttendanceStatus): boolean {
  return status === "present" || status === "excused";
}

function resolveAttendanceTuitionValue(item: AttendanceFormItem): number {
  if (!isChargeableAttendanceStatus(item.status)) {
    return 0;
  }

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

function computeExpectedTeacherAllowanceVnd(options: {
  presentCount: number;
  coefficient: number;
  basePerSession: number;
  scaleAmount: number;
  maxAllowancePerSession: number | null | undefined;
}): number {
  const { presentCount, coefficient, basePerSession, scaleAmount, maxAllowancePerSession } = options;
  const inner = (basePerSession * presentCount + scaleAmount) * coefficient;
  const floored = Math.floor(inner);
  if (maxAllowancePerSession != null && maxAllowancePerSession > 0) {
    return Math.min(floored, maxAllowancePerSession);
  }
  return floored;
}

export default function AddSessionPopup({
  open,
  classId,
  defaultTeacherId,
  teachers = [],
  students,
  sessionTuitionTotal = 0,
  classPricing,
  teacherMode = "select",
  allowFinancialFields = true,
  allowCoefficientField,
  allowAllowanceField,
  allowAttendanceTuitionEdits,
  createSessionFn = sessionApi.createSession,
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const { data: fullProfile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const canEditCoefficient = allowCoefficientField ?? allowFinancialFields;
  const canEditAllowance = allowAllowanceField ?? allowFinancialFields;
  const canEditAttendanceTuition =
    allowAttendanceTuitionEdits ?? allowFinancialFields;
  const isCoefficientOnlyMode =
    canEditCoefficient && !canEditAllowance && !canEditAttendanceTuition;

  const [date, setDate] = useState(() => getTodayDateInputValue());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState("");
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
      status: "absent",
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
        (sum, item) =>
          sum +
          (isChargeableAttendanceStatus(item.status)
            ? (normalizeMoneyValue(item.defaultTuitionFee) ?? 0)
            : 0),
        0,
      ),
    [attendanceItems],
  );
  const attendanceOverrideCount = useMemo(
    () =>
      attendanceItems.filter(
        (item) => isChargeableAttendanceStatus(item.status) && item.tuitionFee.trim() !== "",
      ).length,
    [attendanceItems],
  );
  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === selectedTeacherId) ?? null,
    [teachers, selectedTeacherId],
  );

  const chargeableAttendanceCount = useMemo(
    () =>
      attendanceItems.filter((item) =>
        isChargeableAttendanceStatus(item.status),
      ).length,
    [attendanceItems],
  );

  const resolvedTeacherAllowanceBase = useMemo(() => {
    if (!classPricing) return 0;
    if (!selectedTeacherId) return classPricing.allowancePerSessionPerStudent;
    const custom = classPricing.teacherCustomAllowanceByTeacherId?.[selectedTeacherId];
    if (custom != null && Number.isFinite(custom) && custom > 0) return custom;
    return classPricing.allowancePerSessionPerStudent;
  }, [classPricing, selectedTeacherId]);

  const coefficientNumber = useMemo(() => {
    const c = Number.parseFloat(coefficient.trim() || "1");
    return Number.isFinite(c) && c >= 0.1 && c <= 9.9 ? c : 1;
  }, [coefficient]);

  const expectedAllowancePreview = useMemo(() => {
    if (!classPricing) return null;
    return computeExpectedTeacherAllowanceVnd({
      presentCount: chargeableAttendanceCount,
      coefficient: coefficientNumber,
      basePerSession: resolvedTeacherAllowanceBase,
      scaleAmount: classPricing.scaleAmount ?? 0,
      maxAllowancePerSession: classPricing.maxAllowancePerSession,
    });
  }, [
    classPricing,
    chargeableAttendanceCount,
    coefficientNumber,
    resolvedTeacherAllowanceBase,
  ]);

  const durationLabel = useMemo(
    () => formatVnSessionDuration(startTime, endTime),
    [startTime, endTime],
  );
  const canViewTuitionHeader =
    fullProfile?.roleType === "admin" ||
    (fullProfile?.roleType === "staff" &&
      (fullProfile.staffInfo?.roles ?? []).includes("accountant"));
  const headerTuitionDisplay = useMemo(() => {
    if (!canViewTuitionHeader) return null;
    return `Học phí: ${formatCurrency(resolvedSessionTuitionTotal)}`;
  }, [canViewTuitionHeader, resolvedSessionTuitionTotal]);
  const headerAllowanceDisplay = useMemo(() => {
    if (canEditAllowance && allowanceAmount.trim() !== "") {
      const n = Number(allowanceAmount);
      if (Number.isFinite(n) && n >= 0) {
        return `Trợ cấp gia sư: ${formatCurrency(Math.floor(n))}`;
      }
    }
    if (expectedAllowancePreview != null && classPricing) {
      return `Trợ cấp gia sư: ${formatCurrency(expectedAllowancePreview)}`;
    }
    return null;
  }, [
    canEditAllowance,
    allowanceAmount,
    expectedAllowancePreview,
    classPricing,
  ]);

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
    setNotesError("");

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
      setNotesError("Vui lòng nhập nhận xét cho buổi học.");
      toast.error("Vui lòng nhập nhận xét cho buổi học.");
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
      canEditAttendanceTuition &&
      attendanceItems.some((item) => !isNonNegativeMoneyInput(item.tuitionFee));

    if (hasInvalidAttendanceTuition) {
      toast.error("Học phí từng học sinh phải là số không âm.");
      return;
    }

    const coeffStr = canEditCoefficient ? coefficient.trim() : "";
    const allowanceStr = canEditAllowance ? allowanceAmount.trim() : "";
    const coeffNum = coeffStr ? Number(coefficient) : 1;
    const computedAllowanceNum =
      canEditAllowance && allowanceStr === "" && expectedAllowancePreview != null
        ? expectedAllowancePreview
        : undefined;
    const allowanceNum =
      allowanceStr !== ""
        ? Number(allowanceAmount)
        : computedAllowanceNum;

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
      ...(canEditCoefficient &&
        Number.isFinite(coeffNum) &&
        coeffNum >= 0.1 &&
        coeffNum <= 9.9
        ? { coefficient: coeffNum }
        : {}),
      ...(canEditAllowance &&
        allowanceNum !== undefined &&
        Number.isFinite(allowanceNum) &&
        allowanceNum >= 0
        ? { allowanceAmount: Math.floor(allowanceNum) }
        : {}),
      attendance: toAttendancePayload(
        attendanceItems,
        canEditAttendanceTuition,
      ),
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
        <div className="mx-auto flex min-h-full w-full max-w-3xl items-start py-2 sm:items-center sm:py-0">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-session-title"
            className="my-auto flex max-h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6"
          >
            <SessionFormDialogHeader
              title="Thêm buổi học"
              tuitionText={headerTuitionDisplay}
              allowanceText={headerAllowanceDisplay}
              onClose={onClose}
              titleId="add-session-title"
            />

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-scroll">
                <div className="min-h-0 h-full space-y-6 overflow-y-auto pr-1 sm:pr-2">
                  <div className="space-y-5">
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                      <span>
                        Ngày học <RequiredMark />
                      </span>
                      <input
                        name="add-session-date"
                        type="date"
                        value={date}
                        autoComplete="off"
                        onChange={(event) => setDate(event.target.value)}
                        className="min-h-11 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        required
                      />
                    </label>

                    <div>
                      <p className="mb-1.5 text-sm font-medium text-text-primary">
                        Thời gian <RequiredMark />
                      </p>
                      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                        <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
                          <span>Bắt đầu</span>
                          <input
                            name="add-session-start-time"
                            type="time"
                            step={1}
                            value={startTime}
                            autoComplete="off"
                            onChange={(event) => setStartTime(event.target.value)}
                            className="min-h-11 rounded-lg border border-border-default bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            required
                          />
                        </label>
                        <span
                          className="mb-3 hidden text-text-muted sm:inline"
                          aria-hidden
                        >
                          →
                        </span>
                        <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-text-secondary">
                          <span>Kết thúc</span>
                          <input
                            name="add-session-end-time"
                            type="time"
                            step={1}
                            value={endTime}
                            autoComplete="off"
                            onChange={(event) => setEndTime(event.target.value)}
                            className="min-h-11 rounded-lg border border-border-default bg-bg-surface px-3 py-2 font-mono text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            required
                          />
                        </label>
                      </div>
                      {durationLabel ? (
                        <p className="mt-1.5 text-xs text-text-muted">Thời lượng: {durationLabel}</p>
                      ) : null}
                    </div>

                    {teacherMode === "select" ? (
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                        <span>
                          Gia sư dạy <RequiredMark />
                        </span>
                        <UpgradedSelect
                          name="add-session-teacher"
                          value={selectedTeacherId}
                          onValueChange={setSelectedTeacherId}
                          options={teachers.map((teacher) => ({
                            value: teacher.id,
                            label: teacher.fullName?.trim() || "Gia sư",
                          }))}
                          placeholder="Chọn gia sư"
                          buttonClassName="min-h-11 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-left text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                        <span>
                          Gia sư dạy <RequiredMark />
                        </span>
                        <div
                          className={`flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm ${selectedTeacher
                            ? "border-border-default bg-bg-surface text-text-primary"
                            : "border-warning/30 bg-warning/10 text-warning"
                            }`}
                        >
                          {selectedTeacher?.fullName?.trim() || "Chưa có gia sư cố định cho lớp."}
                        </div>
                      </div>
                    )}

                    {canEditCoefficient ? (
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                        <span>
                          Hệ số (0,1–9,9) <RequiredMark />
                        </span>
                        <input
                          name="add-session-coefficient"
                          type="number"
                          min={0.1}
                          max={9.9}
                          step={0.1}
                          value={coefficient}
                          autoComplete="off"
                          onChange={(e) => setCoefficient(e.target.value)}
                          className="min-h-11 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          placeholder="1"
                        />
                        <span className="text-xs font-normal text-text-muted">Hệ số áp dụng theo cấu hình buổi học (0,1 đến 9,9).</span>
                      </label>
                    ) : null}

                    {canEditAllowance ? (
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                        <span>Trợ cấp buổi (VNĐ)</span>
                        <input
                          name="add-session-allowance"
                          type="number"
                          min={0}
                          value={allowanceAmount}
                          autoComplete="off"
                          onChange={(e) => setAllowanceAmount(e.target.value)}
                          className="min-h-11 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          placeholder="Để trống = theo cấu hình lớp/gia sư"
                        />
                        <span className="text-xs font-normal text-text-muted">
                          Để trống để tự điền theo công thức từ cấu hình lớp/gia sư.
                        </span>
                        {classPricing ? (
                          <span className="text-xs font-normal text-text-muted">
                            Công thức: ({formatCurrency(resolvedTeacherAllowanceBase)} × {chargeableAttendanceCount} +{" "}
                            {formatCurrency(classPricing.scaleAmount ?? 0)}) ×{" "}
                            {coefficientNumber.toLocaleString("vi-VN")}
                            {classPricing.maxAllowancePerSession != null &&
                            classPricing.maxAllowancePerSession > 0
                              ? `, tối đa ${formatCurrency(classPricing.maxAllowancePerSession)}`
                              : ""}
                            . Giá trị hiện tại:{" "}
                            <span className="font-medium text-text-primary">
                              {formatCurrency(expectedAllowancePreview ?? 0)}
                            </span>
                            .
                          </span>
                        ) : null}
                      </label>
                    ) : !canEditAllowance && classPricing ? (
                      <div className="rounded-lg border border-border-default bg-bg-secondary/40 px-3 py-3">
                        <p className="text-sm font-medium text-text-primary">Trợ cấp giáo viên (ước tính)</p>
                        <p className="mt-2 text-lg font-semibold tabular-nums text-primary">
                          {formatCurrency(expectedAllowancePreview ?? 0)}
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-text-muted">
                          <p>
                            Học sinh tính trợ cấp: {chargeableAttendanceCount} × hệ số{" "}
                            {coefficientNumber.toLocaleString("vi-VN")}
                          </p>
                          <p>
                            Công thức: ({formatCurrency(resolvedTeacherAllowanceBase)} × {chargeableAttendanceCount} +{" "}
                            {formatCurrency(classPricing.scaleAmount ?? 0)}) × {coefficientNumber.toLocaleString("vi-VN")}
                            {classPricing.maxAllowancePerSession != null &&
                            classPricing.maxAllowancePerSession > 0
                              ? `, tối đa ${formatCurrency(classPricing.maxAllowancePerSession)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ) : isCoefficientOnlyMode ? (
                      <p className="rounded-lg border border-border-default/80 bg-bg-secondary/30 px-3 py-2 text-xs text-text-muted">
                        Bạn chỉ chỉnh được hệ số; trợ cấp do backend lấy theo cấu hình lớp/gia sư.
                      </p>
                    ) : null}

                    {allowFinancialFields ? (
                      <div>
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                          <span>
                            Trạng thái thanh toán <RequiredMark />
                          </span>
                          <div className="flex min-h-11 items-center rounded-lg border border-border-default bg-bg-secondary/60 px-3 py-2 text-sm text-text-secondary">
                            Chưa thanh toán
                          </div>
                          <span className="text-xs font-normal text-text-muted">
                            Khi tạo mới, trạng thái mặc định là chưa thanh toán. Đổi trạng thái sau khi lưu từ bảng lịch sử buổi học nếu cần.
                          </span>
                        </label>
                      </div>
                    ) : null}

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-text-primary">
                      <span>
                        Nhận xét <RequiredMark />
                      </span>
                      <RichTextEditor
                        value={notes}
                        onChange={(v) => {
                          setNotes(v);
                          if (notesError) setNotesError("");
                        }}
                        minHeight="min-h-[160px]"
                      />
                      {notesError ? (
                        <span className="text-xs font-medium text-error" role="alert">
                          {notesError}
                        </span>
                      ) : (
                        <span className="text-xs font-normal text-text-muted">
                          Nhận xét về buổi học, tiến độ học sinh…
                        </span>
                      )}
                    </label>
                  </div>

                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">
                        Điểm danh học sinh <RequiredMark />
                      </h3>
                      {canEditAttendanceTuition ? (
                        <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-border-default bg-bg-secondary/40 p-3 text-xs">
                          <span className="text-text-muted">Học phí buổi:</span>
                          <span className="font-medium tabular-nums text-text-primary">
                            Mặc định {formatCurrency(attendanceDefaultTuitionTotal)}
                          </span>
                          <span className="text-text-muted">·</span>
                          <span className="font-semibold tabular-nums text-primary">
                            Đang áp dụng {formatCurrency(resolvedSessionTuitionTotal)}
                          </span>
                          {attendanceOverrideCount > 0 ? (
                            <>
                              <span className="text-text-muted">·</span>
                              <span>Điều chỉnh {attendanceOverrideCount} học sinh</span>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {students.length === 0 ? (
                      <p className="py-6 text-center text-sm text-text-muted">Lớp chưa có học sinh.</p>
                    ) : (
                      <>
                        <div className="space-y-3 md:hidden">
                          {attendanceItems.map((item) => (
                            <article
                              key={item.studentId}
                              className="rounded-xl border border-border-default bg-bg-surface p-4"
                            >
                              <p className="text-sm font-semibold text-text-primary">{item.fullName}</p>
                              {canEditAttendanceTuition ? (
                                <p className="mt-1 text-xs text-text-muted">
                                  Mặc định:{" "}
                                  <span className="font-medium tabular-nums text-text-primary">
                                    {item.defaultTuitionFee != null
                                      ? formatCurrency(item.defaultTuitionFee)
                                      : "Chưa cấu hình"}
                                  </span>
                                </p>
                              ) : null}
                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <AttendanceStatusQuickPick
                                  namePrefix={`add-att-${item.studentId}`}
                                  value={item.status}
                                  onChange={(next) =>
                                    handleAttendanceStatusChange(item.studentId, next)
                                  }
                                />
                              </div>
                              {canEditAttendanceTuition ? (
                                <label className="mt-3 flex flex-col gap-1 text-xs text-text-secondary">
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
                                    className="min-h-10 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary"
                                    placeholder={
                                      item.defaultTuitionFee != null
                                        ? String(item.defaultTuitionFee)
                                        : "Theo học sinh"
                                    }
                                  />
                                </label>
                              ) : null}
                              <label className="mt-3 flex flex-col gap-1 text-xs text-text-secondary">
                                <span>Ghi chú</span>
                                <input
                                  name={`add-session-attendance-note-${item.studentId}`}
                                  value={item.notes}
                                  autoComplete="off"
                                  onChange={(event) =>
                                    handleAttendanceNotesChange(item.studentId, event.target.value)
                                  }
                                  maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                                  className="min-h-10 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary"
                                  placeholder="Ghi chú (nếu cần)"
                                />
                              </label>
                            </article>
                          ))}
                        </div>

                        <div className="hidden overflow-x-auto rounded-xl border border-border-default bg-bg-surface md:block">
                          <table
                            className={`w-full border-collapse text-left text-sm ${canEditAttendanceTuition ? "min-w-[720px]" : "min-w-[520px]"}`}
                          >
                            <caption className="sr-only">Điểm danh học sinh</caption>
                            <thead>
                              <tr className="border-b border-border-default bg-bg-secondary/80">
                                <th scope="col" className="w-28 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                  Trạng thái
                                </th>
                                <th scope="col" className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                  Tên học sinh
                                </th>
                                <th scope="col" className="min-w-[12rem] px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                  Ghi chú
                                </th>
                                {canEditAttendanceTuition ? (
                                  <th scope="col" className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                                    Học phí buổi
                                  </th>
                                ) : null}
                              </tr>
                            </thead>
                            <tbody>
                              {attendanceItems.map((item) => (
                                <tr
                                  key={item.studentId}
                                  className="border-b border-border-default/80 bg-bg-surface last:border-0"
                                >
                                  <td className="px-3 py-2.5 align-middle">
                                    <AttendanceStatusQuickPick
                                      namePrefix={`add-att-d-${item.studentId}`}
                                      value={item.status}
                                      onChange={(next) =>
                                        handleAttendanceStatusChange(item.studentId, next)
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 align-middle text-sm font-medium text-text-primary">
                                    {item.fullName}
                                  </td>
                                  <td className="px-3 py-2.5 align-middle">
                                    <input
                                      name={`add-session-attendance-note-desktop-${item.studentId}`}
                                      value={item.notes}
                                      autoComplete="off"
                                      onChange={(event) =>
                                        handleAttendanceNotesChange(item.studentId, event.target.value)
                                      }
                                      maxLength={MAX_ATTENDANCE_NOTES_LENGTH}
                                      className="w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary"
                                      placeholder="Ghi chú (nếu cần)"
                                    />
                                  </td>
                                  {canEditAttendanceTuition ? (
                                    <td className="px-3 py-2.5 align-middle">
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
                                          className="w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-sm tabular-nums text-text-primary"
                                          placeholder={
                                            item.defaultTuitionFee != null
                                              ? String(item.defaultTuitionFee)
                                              : "Theo học sinh"
                                          }
                                        />
                                        <p className="text-[11px] text-text-muted">
                                          Mặc định:{" "}
                                          {item.defaultTuitionFee != null
                                            ? formatCurrency(item.defaultTuitionFee)
                                            : "—"}
                                        </p>
                                      </div>
                                    </td>
                                  ) : null}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <AttendanceInlineSummary
                          present={attendanceSummary.present}
                          excused={attendanceSummary.excused}
                          absent={attendanceSummary.absent}
                        />
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
