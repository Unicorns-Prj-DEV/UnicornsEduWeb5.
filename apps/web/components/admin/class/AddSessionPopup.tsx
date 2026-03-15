"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SessionAttendanceItem,
  SessionAttendanceStatus,
  SessionCreatePayload,
  SessionItem,
} from "@/dtos/session.dto";
import * as sessionApi from "@/lib/apis/session.api";
import RichTextEditor from "@/components/ui/RichTextEditor";

export interface SessionStudentItem {
  id: string;
  fullName: string;
}

type AttendanceFormItem = {
  studentId: string;
  fullName: string;
  status: SessionAttendanceStatus;
  notes: string;
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
  }));
}

export default function AddSessionPopup({
  open,
  classId,
  defaultTeacherId,
  teachers = [],
  students,
  onClose,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();

  const [date, setDate] = useState(getTodayDateInputValue());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [notes, setNotes] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState(defaultTeacherId ?? teachers[0]?.id ?? "");
  const [attendanceItems, setAttendanceItems] = useState<AttendanceFormItem[]>([]);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    setDate(getTodayDateInputValue());
    setStartTime("18:00");
    setEndTime("20:00");
    setNotes("");
    setSelectedTeacherId(defaultTeacherId ?? teachers[0]?.id ?? "");
    setAttendanceItems(
      students.map((student) => ({
        studentId: student.id,
        fullName: student.fullName,
        status: "present",
        notes: "",
      })),
    );
  }, [open, students, defaultTeacherId, teachers]);

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

    const payload: SessionCreatePayload = {
      classId,
      teacherId: selectedTeacherId,
      date,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
      notes: trimmedSessionNotes,
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
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id="add-session-title" className="text-lg font-semibold text-text-primary">
            Thêm buổi học
          </h2>
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
              <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                Điểm danh học sinh
              </h3>
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
              </div>
            </div>

            {students.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-default bg-bg-surface px-4 py-6 text-center text-sm text-text-muted">
                Lớp chưa có học sinh.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border-default bg-bg-surface">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
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
