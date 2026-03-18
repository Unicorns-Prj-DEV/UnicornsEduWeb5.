"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StudentDetail, StudentGender, StudentStatus } from "@/dtos/student.dto";
import * as studentApi from "@/lib/apis/student.api";
import {
  readStudentExamSchedule,
  saveStudentExamSchedule,
  type StudentExamItem,
} from "./StudentExamCard";

type Props = {
  open: boolean;
  onClose: () => void;
  student: StudentDetail;
  onSuccess?: () => void | Promise<void>;
};

const STATUS_OPTIONS: Array<{ value: StudentStatus; label: string }> = [
  { value: "active", label: "Đang học" },
  { value: "inactive", label: "Ngừng theo dõi" },
];

const GENDER_OPTIONS: Array<{ value: StudentGender; label: string }> = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
];

export default function EditStudentPopup({ open, onClose, student, onSuccess }: Props) {
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(student.fullName ?? "");
  const [email, setEmail] = useState(student.email ?? "");
  const [school, setSchool] = useState(student.school ?? "");
  const [province, setProvince] = useState(student.province ?? "");
  const [birthYearInput, setBirthYearInput] = useState(
    student.birthYear == null ? "" : String(student.birthYear),
  );
  const [parentName, setParentName] = useState(student.parentName ?? "");
  const [parentPhone, setParentPhone] = useState(student.parentPhone ?? "");
  const [gender, setGender] = useState<StudentGender>(student.gender ?? "male");
  const [status, setStatus] = useState<StudentStatus>(student.status ?? "active");
  const [goal, setGoal] = useState(student.goal ?? "");
  const [dropOutDate, setDropOutDate] = useState(student.dropOutDate ?? "");
  const [examItems, setExamItems] = useState<StudentExamItem[]>([]);

  const createLocalId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const normalizeExamDate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? trimmed : "";
  };

  useEffect(() => {
    if (!open) return;
    setExamItems(readStudentExamSchedule(student.id));
  }, [open, student.id]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof studentApi.updateStudentById>[1]) =>
      studentApi.updateStudentById(student.id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student", "detail", student.id] }),
        queryClient.invalidateQueries({ queryKey: ["student", "list"] }),
      ]);
      await onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật thông tin học sinh.";
      toast.error(msg);
    },
  });

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error("Họ tên là bắt buộc.");
      return;
    }

    const hasInvalidExamItem = examItems.some((item) => {
      const hasAnyContent = Boolean(item.examDate?.trim() || item.note?.trim());
      if (!hasAnyContent) return false;
      return normalizeExamDate(item.examDate) === "";
    });
    if (hasInvalidExamItem) {
      toast.error("Ngày thi không hợp lệ. Vui lòng chọn ngày thi cho từng dòng lịch thi.");
      return;
    }

    const trimmedBirthYear = birthYearInput.trim();
    const currentYear = new Date().getFullYear();
    let parsedBirthYear: number | undefined;

    if (trimmedBirthYear) {
      parsedBirthYear = Number(trimmedBirthYear);
      if (
        !Number.isInteger(parsedBirthYear) ||
        parsedBirthYear < 1900 ||
        parsedBirthYear > currentYear
      ) {
        toast.error("Năm sinh không hợp lệ.");
        return;
      }
    }

    try {
      await updateMutation.mutateAsync({
        full_name: trimmedName,
        email: email.trim() || undefined,
        school: school.trim() || undefined,
        province: province.trim() || undefined,
        birth_year: parsedBirthYear,
        parent_name: parentName.trim() || undefined,
        parent_phone: parentPhone.trim() || undefined,
        gender,
        status,
        goal: goal.trim() || undefined,
        drop_out_date: dropOutDate.trim() || undefined,
      });
      const normalizedExamItems = examItems
        .map((item) => ({
          ...item,
          examDate: normalizeExamDate(item.examDate),
          note: item.note ?? "",
        }))
        .filter((item) => item.examDate);
      saveStudentExamSchedule(student.id, normalizedExamItems);
      toast.success("Đã lưu thông tin học sinh.");
      onClose();
    } catch {
      // toast lỗi đã được xử lý trong onError
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-student-title"
        className="fixed inset-x-3 bottom-3 top-20 z-50 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-border-default bg-bg-surface shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-[min(42rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div className="border-b border-border-default bg-gradient-to-r from-bg-secondary via-bg-surface to-bg-secondary/70 px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                Edit Student
              </p>
              <h2 id="edit-student-title" className="mt-1 text-lg font-semibold text-text-primary">
                Chỉnh sửa hồ sơ học sinh
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border-default bg-bg-surface p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Đóng"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form
          id="edit-student-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 py-4 sm:px-5"
        >
          <div className="grid gap-4">
            <section className="rounded-2xl border border-border-default bg-bg-secondary/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Họ và tên</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="student@example.com"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Năm sinh</span>
                  <input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={birthYearInput}
                    onChange={(event) => setBirthYearInput(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="2010"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Trường</span>
                  <input
                    value={school}
                    onChange={(event) => setSchool(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="THPT ABC"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Tỉnh / Thành phố</span>
                  <input
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="TP. HCM"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-border-default bg-bg-secondary/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Tên phụ huynh</span>
                  <input
                    value={parentName}
                    onChange={(event) => setParentName(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="Nguyễn Thị B"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>SĐT phụ huynh</span>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(event) => setParentPhone(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="0912345678"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Giới tính</span>
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value as StudentGender)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Trạng thái</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as StudentStatus)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Mục tiêu học tập</span>
                  <textarea
                    rows={3}
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="resize-none rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="Ví dụ: Hoàn thành chương trình IELTS Foundation trong quý này"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Ngày ngừng theo dõi</span>
                  <input
                    type="date"
                    value={dropOutDate}
                    onChange={(event) => setDropOutDate(event.target.value)}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-border-default bg-bg-secondary/50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Exam Schedule
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-text-primary">Lịch thi</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Thêm các ngày thi và ghi chú. Danh sách sẽ hiển thị ở trang chi tiết học sinh.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExamItems((prev) => [
                      ...prev,
                      { id: createLocalId(), examDate: "", note: "", createdAt: new Date().toISOString() },
                    ]);
                  }}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label="Thêm ngày thi"
                  title="Thêm ngày thi"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {examItems.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border-default bg-bg-surface px-4 py-4 text-sm text-text-muted">
                  Chưa có lịch thi.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {examItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-[1.1rem] border border-border-default bg-bg-surface px-3.5 py-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          Kỳ thi #{index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => setExamItems((prev) => prev.filter((x) => x.id !== item.id))}
                          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-error/10 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          aria-label="Xóa lịch thi"
                          title="Xóa"
                        >
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm text-text-secondary">
                          <span>Ngày thi</span>
                          <input
                            type="date"
                            value={item.examDate}
                            onChange={(e) =>
                              setExamItems((prev) =>
                                prev.map((x) => (x.id === item.id ? { ...x, examDate: e.target.value } : x)),
                              )
                            }
                            className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          />
                        </label>

                        <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                          <span>Ghi chú kỳ thi</span>
                          <input
                            value={item.note}
                            onChange={(e) =>
                              setExamItems((prev) =>
                                prev.map((x) => (x.id === item.id ? { ...x, note: e.target.value } : x)),
                              )
                            }
                            placeholder="Ví dụ: Thi cuối kỳ / Thi chứng chỉ / Thi HSG..."
                            className="rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </form>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-default px-4 py-4 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="edit-student-form"
            disabled={updateMutation.isPending}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
          >
            {updateMutation.isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </>
  );
}
