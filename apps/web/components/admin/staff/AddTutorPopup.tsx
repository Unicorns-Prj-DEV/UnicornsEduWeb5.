"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  StaffAssignableUser,
  StaffDetail,
} from "@/dtos/staff.dto";
import * as staffApi from "@/lib/apis/staff.api";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (staff: StaffDetail) => void | Promise<void>;
};

const USER_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  student: "Học viên",
  guest: "Khách",
};

const USER_STATUS_LABELS: Record<string, string> = {
  active: "Hoạt động",
  inactive: "Ngưng hoạt động",
  pending: "Đang chờ",
};

function getSuggestedFullName(user: StaffAssignableUser | null): string {
  if (!user) return "";
  return user.fullName?.trim() || user.email.trim();
}

export default function AddTutorPopup({ open, onClose, onCreated }: Props) {
  const queryClient = useQueryClient();

  const [emailInput, setEmailInput] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDateInput, setBirthDateInput] = useState("");
  const [university, setUniversity] = useState("");
  const [highSchool, setHighSchool] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankQrLink, setBankQrLink] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setEmailInput("");
    setSearchEmail("");
    setSelectedUserId("");
    setFullName("");
    setBirthDateInput("");
    setUniversity("");
    setHighSchool("");
    setSpecialization("");
    setBankAccount("");
    setBankQrLink("");
  }, [open]);

  const {
    data: assignableUsers = [],
    isFetching: isSearchingUsers,
    isError: isSearchError,
    error: searchError,
  } = useQuery<StaffAssignableUser[]>({
    queryKey: ["staff", "assignable-users", searchEmail],
    queryFn: () => staffApi.searchAssignableUsersByEmail(searchEmail),
    enabled: open && searchEmail.trim().length >= 2,
    staleTime: 30_000,
  });

  const selectedUser = useMemo(
    () => assignableUsers.find((user) => user.id === selectedUserId) ?? null,
    [assignableUsers, selectedUserId],
  );

  const createMutation = useMutation({
    mutationFn: staffApi.createStaff,
    onSuccess: async (createdStaff) => {
      await queryClient.invalidateQueries({ queryKey: ["staff", "list"] });
      await onCreated?.(createdStaff);
      toast.success("Đã tạo hồ sơ gia sư.");
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể tạo hồ sơ gia sư.";
      toast.error(msg);
    },
  });

  const handleSearch = () => {
    const trimmedEmail = emailInput.trim();
    if (trimmedEmail.length < 2) {
      toast.error("Nhập ít nhất 2 ký tự email để tìm user.");
      return;
    }

    setSearchEmail(trimmedEmail);
    setSelectedUserId("");
    setFullName("");
  };

  const handleEmailInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleSearch();
  };

  const handleSelectUser = (user: StaffAssignableUser) => {
    if (!user.isEligible) {
      return;
    }

    setSelectedUserId(user.id);
    setFullName(getSuggestedFullName(user));
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUser) {
      toast.error("Chọn một user đã tìm thấy để gán làm gia sư.");
      return;
    }

    if (!selectedUser.isEligible) {
      toast.error(selectedUser.ineligibleReason || "User này không thể gán làm gia sư.");
      return;
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error("Họ và tên gia sư là bắt buộc.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        full_name: trimmedName,
        birth_date: birthDateInput.trim() || undefined,
        university: university.trim() || undefined,
        high_school: highSchool.trim() || undefined,
        specialization: specialization.trim() || undefined,
        bank_account: bankAccount.trim() || undefined,
        bank_qr_link: bankQrLink.trim() || undefined,
        roles: ["teacher"],
        user_id: selectedUser.id,
      });
    } catch {
      // handled in onError
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 p-2 sm:p-4">
        <div className="mx-auto flex h-full w-full max-w-4xl items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-tutor-title"
            className="flex max-h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-border-default bg-bg-surface shadow-2xl"
          >
            <div className="relative overflow-hidden border-b border-border-default/70 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(37,99,235,0.03)_45%,rgba(245,158,11,0.08))] px-4 py-4 sm:px-6">
              <div className="pointer-events-none absolute -right-10 top-0 size-28 rounded-full bg-primary/10 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute bottom-0 left-10 size-24 rounded-full bg-warning/15 blur-3xl" aria-hidden />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                    Staff Assignment
                  </p>
                  <h2 id="add-tutor-title" className="mt-2 text-xl font-semibold text-text-primary">
                    Tạo hồ sơ gia sư từ user có sẵn
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                    Tìm user bằng email, chọn đúng tài khoản hợp lệ, sau đó hoàn thiện hồ sơ gia sư
                    tối thiểu. Role nhân sự sẽ được khóa ở chế độ gia sư.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl p-2 text-text-muted transition-colors duration-200 hover:bg-bg-surface/80 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label="Đóng"
                >
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <section className="min-h-0 overflow-y-auto border-b border-border-default/70 bg-bg-secondary/35 px-4 py-4 sm:px-6 lg:border-b-0 lg:border-r">
                  <div className="rounded-[1.5rem] border border-primary/10 bg-bg-surface px-4 py-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                      Bước 1
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-text-primary">Tìm user theo email</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      Hệ thống chỉ cho gán các user chưa có hồ sơ nhân sự và có role hiện tại phù hợp.
                    </p>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <label className="min-w-0 flex-1">
                        <span className="mb-1 block text-sm font-medium text-text-secondary">Email user</span>
                        <input
                          type="text"
                          value={emailInput}
                          onChange={(event) => setEmailInput(event.target.value)}
                          onKeyDown={handleEmailInputKeyDown}
                          placeholder="teacher@example.com"
                          autoComplete="off"
                          className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSearch}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                        </svg>
                        Tìm user
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {searchEmail.trim().length === 0 ? (
                      <div className="rounded-[1.4rem] border border-dashed border-border-default bg-bg-surface/80 px-4 py-6 text-sm text-text-muted">
                        Chưa có truy vấn. Nhập email để bắt đầu tìm user cần gán.
                      </div>
                    ) : isSearchingUsers ? (
                      <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div
                            key={index}
                            className="rounded-[1.4rem] border border-border-default bg-bg-surface px-4 py-4"
                          >
                            <div className="h-4 w-28 animate-pulse rounded bg-bg-tertiary" />
                            <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-bg-tertiary" />
                            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-bg-tertiary" />
                          </div>
                        ))}
                      </div>
                    ) : isSearchError ? (
                      <div className="rounded-[1.4rem] border border-error/30 bg-error/10 px-4 py-4 text-sm text-error">
                        {(searchError as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                          (searchError as Error)?.message ??
                          "Không tìm được user theo email."}
                      </div>
                    ) : assignableUsers.length === 0 ? (
                      <div className="rounded-[1.4rem] border border-dashed border-border-default bg-bg-surface/80 px-4 py-6 text-sm text-text-muted">
                        Không có user nào khớp với email vừa tìm.
                      </div>
                    ) : (
                      assignableUsers.map((user) => {
                        const isSelected = user.id === selectedUserId;

                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectUser(user)}
                            disabled={!user.isEligible}
                            className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition-all duration-200 ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-[0_12px_32px_-20px_rgba(37,99,235,0.5)]"
                                : user.isEligible
                                  ? "border-border-default bg-bg-surface hover:border-primary/35 hover:bg-bg-surface"
                                  : "border-border-default bg-bg-surface/65 opacity-75"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text-primary">
                                  {user.fullName?.trim() || user.email}
                                </p>
                                <p className="mt-1 truncate text-sm text-text-secondary">{user.email}</p>
                                <p className="mt-1 text-xs text-text-muted">
                                  Handle: {user.accountHandle || "—"}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <span className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                                  {USER_ROLE_LABELS[user.roleType] ?? user.roleType}
                                </span>
                                <span className="rounded-full border border-border-default bg-bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                                  {USER_STATUS_LABELS[user.status] ?? user.status}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                              <span className="rounded-full bg-bg-secondary px-2.5 py-1">
                                Tỉnh: {user.province?.trim() || "Chưa cập nhật"}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 ${
                                  user.isEligible
                                    ? "bg-success/10 text-success"
                                    : "bg-warning/15 text-warning"
                                }`}
                              >
                                {user.isEligible ? "Có thể gán" : "Không thể gán"}
                              </span>
                            </div>

                            {!user.isEligible && user.ineligibleReason ? (
                              <p className="mt-3 text-xs text-warning">{user.ineligibleReason}</p>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
                  <div className="rounded-[1.5rem] border border-border-default bg-bg-surface px-4 py-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                          Bước 2
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-text-primary">
                          Hoàn thiện hồ sơ gia sư
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          Role nhân sự sẽ được khóa là <span className="font-medium text-primary">teacher</span>.
                        </p>
                      </div>

                      <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                        Gia sư
                      </span>
                    </div>

                    {selectedUser ? (
                      <div className="mt-4 rounded-[1.25rem] border border-primary/10 bg-primary/5 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          User được chọn
                        </p>
                        <p className="mt-2 text-sm font-semibold text-text-primary">
                          {selectedUser.fullName?.trim() || selectedUser.email}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">{selectedUser.email}</p>
                        <p className="mt-3 text-xs leading-5 text-text-secondary">
                          Sau khi tạo hồ sơ, tài khoản này sẽ được dùng ở các luồng staff/teacher.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.25rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-6 text-sm text-text-muted">
                        Chọn một user hợp lệ ở cột bên trái để tiếp tục.
                      </div>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                        <span>Họ và tên hiển thị</span>
                        <input
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          disabled={!selectedUser?.isEligible}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-muted"
                          required
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-text-secondary">
                        <span>Ngày sinh</span>
                        <input
                          type="date"
                          value={birthDateInput}
                          onChange={(event) => setBirthDateInput(event.target.value)}
                          disabled={!selectedUser?.isEligible}
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-muted"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-text-secondary">
                        <span>Đại học</span>
                        <input
                          value={university}
                          onChange={(event) => setUniversity(event.target.value)}
                          disabled={!selectedUser?.isEligible}
                          placeholder="Ví dụ: ĐH Bách Khoa"
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-muted"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-text-secondary">
                        <span>THPT</span>
                        <input
                          value={highSchool}
                          onChange={(event) => setHighSchool(event.target.value)}
                          disabled={!selectedUser?.isEligible}
                          placeholder="Ví dụ: THPT Lê Hồng Phong"
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-muted"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-text-secondary">
                        <span>Số tài khoản</span>
                        <input
                          value={bankAccount}
                          onChange={(event) => setBankAccount(event.target.value)}
                          disabled={!selectedUser?.isEligible}
                          placeholder="Ví dụ: 1234567890"
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-muted"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                        <span>Chuyên môn</span>
                        <textarea
                          value={specialization}
                          onChange={(event) => setSpecialization(event.target.value)}
                          disabled={!selectedUser?.isEligible}
                          rows={3}
                          placeholder="Ví dụ: Toán, tổ hợp, chuyên đề lớp 10-12"
                          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-muted"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                        <span>Link QR thanh toán</span>
                        <input
                          type="url"
                          value={bankQrLink}
                          onChange={(event) => setBankQrLink(event.target.value)}
                          disabled={!selectedUser?.isEligible}
                          placeholder="https://..."
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-muted"
                        />
                      </label>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border-default bg-bg-surface px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!selectedUser?.isEligible || createMutation.isPending}
                  className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createMutation.isPending ? "Đang tạo..." : "Tạo gia sư"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
