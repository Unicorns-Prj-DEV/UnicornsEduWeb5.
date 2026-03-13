"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { StaffDetail } from "@/dtos/staff.dto";
import * as staffApi from "@/lib/apis/staff.api";

type Props = {
  open: boolean;
  onClose: () => void;
  staff: StaffDetail;
};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Giáo viên" },
  { value: "lesson_plan", label: "Giáo án" },
  { value: "lesson_plan_head", label: "Trưởng nhóm giáo án" },
  { value: "accountant", label: "Kế toán" },
  { value: "communication", label: "Truyền thông" },
  { value: "communication_head", label: "Trưởng truyền thông" },
  { value: "customer_care", label: "CSKH" },
  { value: "customer_care_head", label: "Trưởng CSKH" },
];

function formatDateInput(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

export default function EditStaffPopup({ open, onClose, staff }: Props) {
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState(staff.fullName ?? "");
  const [birthDateInput, setBirthDateInput] = useState(formatDateInput(staff.birthDate));
  const [university, setUniversity] = useState(staff.university ?? "");
  const [highSchool, setHighSchool] = useState(staff.highSchool ?? "");
  const [specialization, setSpecialization] = useState(staff.specialization ?? "");
  const [bankAccount, setBankAccount] = useState(staff.bankAccount ?? "");
  const [bankQrLink, setBankQrLink] = useState(staff.bankQrLink ?? "");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    () => new Set(staff.roles ?? []),
  );

  useEffect(() => {
    if (!open) return;
    setFullName(staff.fullName ?? "");
    setBirthDateInput(formatDateInput(staff.birthDate));
    setUniversity(staff.university ?? "");
    setHighSchool(staff.highSchool ?? "");
    setSpecialization(staff.specialization ?? "");
    setBankAccount(staff.bankAccount ?? "");
    setBankQrLink(staff.bankQrLink ?? "");
    setSelectedRoles(new Set(staff.roles ?? []));
  }, [open, staff]);

  const updateMutation = useMutation({
    mutationFn: staffApi.updateStaff,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff", "detail", staff.id] }),
        queryClient.invalidateQueries({ queryKey: ["staff", "list"] }),
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật thông tin nhân sự.";
      toast.error(msg);
    },
  });

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error("Họ tên là bắt buộc.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: staff.id,
        full_name: trimmedName,
        birth_date: birthDateInput.trim() || undefined,
        university: university.trim() || undefined,
        high_school: highSchool.trim() || undefined,
        specialization: specialization.trim() || undefined,
        bank_account: bankAccount.trim() || undefined,
        bank_qr_link: bankQrLink.trim() || undefined,
        roles: Array.from(selectedRoles),
      });
      toast.success("Đã lưu thông tin nhân sự.");
      onClose();
    } catch {
      // lỗi đã được xử lý trong onError
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-staff-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-hidden flex flex-col rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between shrink-0">
          <h2 id="edit-staff-title" className="text-lg font-semibold text-text-primary">
            Chỉnh sửa thông tin nhân sự
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                <span>Họ và tên</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Ngày sinh</span>
                <input
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="cursor-pointer rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Tỉnh / Thành phố</span>
                <input
                  value={staff.user?.province ?? ""}
                  readOnly
                  className="rounded-md border border-border-default bg-bg-tertiary px-3 py-2 text-text-muted cursor-not-allowed"
                  title="Chỉnh sửa qua tài khoản người dùng"
                />
                <p className="text-xs text-text-muted">Chỉnh sửa qua quản lý tài khoản.</p>
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Trường đại học</span>
                <input
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Ví dụ: ĐH Bách Khoa"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Trường THPT</span>
                <input
                  value={highSchool}
                  onChange={(e) => setHighSchool(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Ví dụ: THPT Lê Hồng Phong"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                <span>Mô tả chuyên môn</span>
                <textarea
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  rows={2}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus resize-none"
                  placeholder="Ví dụ: Toán, Lý"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Số tài khoản ngân hàng</span>
                <input
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Ví dụ: 1234567890"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Link QR thanh toán</span>
                <input
                  type="url"
                  value={bankQrLink}
                  onChange={(e) => setBankQrLink(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="https://..."
                />
              </label>

              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium text-text-secondary">Vai trò</p>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-200"
                      style={{
                        borderColor: selectedRoles.has(opt.value)
                          ? "var(--color-primary, #6366f1)"
                          : "var(--color-border-default, #e5e7eb)",
                        backgroundColor: selectedRoles.has(opt.value)
                          ? "color-mix(in srgb, var(--color-primary, #6366f1) 15%, transparent)"
                          : "transparent",
                        color: selectedRoles.has(opt.value)
                          ? "var(--color-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.has(opt.value)}
                        onChange={() => toggleRole(opt.value)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4 shrink-0">
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
              {updateMutation.isPending ? "Đang lưu…" : "Lưu thông tin"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
