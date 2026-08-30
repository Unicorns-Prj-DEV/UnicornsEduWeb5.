"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  StudentBalancePopup,
  StudentWalletCard,
  StudentWalletHistoryPopup,
} from "@/components/admin/student";
import { StudentDashboardSkeleton } from "@/components/student/StudentDashboardSkeleton";
import OjProgressSection from "@/components/student/OjProgressSection";
import QueryRefreshStrip from "@/components/ui/query-refresh-strip";
import type {
  StudentSelfClassItem,
  StudentSelfDetail,
  StudentStatus,
} from "@/dtos/student.dto";
import {
  getMyStudentSePayStaticQr,
  getMyStudentDetail,
  getMyStudentWalletHistory,
} from "@/lib/apis/auth.api";
import { formatCurrency } from "@/lib/class.helpers";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Đang học",
  inactive: "Ngừng theo dõi",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function normalizeStatus(status?: StudentStatus): StudentStatus {
  return status === "inactive" ? "inactive" : "active";
}

function getClassStatusLabel(status?: StudentSelfClassItem["class"]["status"]): string {
  if (status === "running") return "Đang mở";
  if (status === "ended") return "Đã kết thúc";
  return "—";
}

function getTuitionSourceLabel(source?: StudentSelfClassItem["tuitionPackageSource"]): string {
  if (source === "custom") return "Mức riêng";
  if (source === "class") return "Theo lớp";
  return "Chưa thiết lập";
}

function getTuitionSourceClass(source?: StudentSelfClassItem["tuitionPackageSource"]): string {
  if (source === "custom") {
    return "bg-primary/10 text-primary ring-primary/20";
  }
  if (source === "class") {
    return "bg-info/10 text-info ring-info/20";
  }
  return "bg-bg-tertiary text-text-secondary ring-border-default";
}

function formatTuitionPerSession(value?: number | null): string {
  return value != null ? formatCurrency(value) : "Chưa thiết lập";
}

function formatTuitionPackage(item: StudentSelfClassItem): string {
  if (
    item.effectiveTuitionPackageTotal != null &&
    item.effectiveTuitionPackageSession != null
  ) {
    return `${formatCurrency(item.effectiveTuitionPackageTotal)} / ${item.effectiveTuitionPackageSession} buổi`;
  }
  if (item.effectiveTuitionPackageTotal != null) {
    return formatCurrency(item.effectiveTuitionPackageTotal);
  }
  if (item.effectiveTuitionPackageSession != null) {
    return `${item.effectiveTuitionPackageSession} buổi`;
  }
  return "Không áp dụng";
}

export default function StudentSelfPage() {
  const [balancePopupMode, setBalancePopupMode] = useState<"topup" | "withdraw" | null>(null);
  const [walletHistoryOpen, setWalletHistoryOpen] = useState(false);

  const {
    data: student,
    isLoading,
    isFetching: isStudentFetching,
    isError,
    error,
  } = useQuery<StudentSelfDetail>({
    queryKey: ["student", "self", "detail"],
    queryFn: getMyStudentDetail,
    retry: false,
    staleTime: 60_000,
  });

  const {
    data: sePayStaticQr,
    isLoading: isSePayStaticQrLoading,
    error: sePayStaticQrError,
  } = useQuery({
    queryKey: ["student", "self", "sepay-static-qr"],
    queryFn: getMyStudentSePayStaticQr,
    enabled: balancePopupMode === "topup" && Boolean(student?.id),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const classItems = useMemo(
    () =>
      (student?.studentClasses ?? []).toSorted((a, b) =>
        (a.class?.name ?? "").localeCompare(b.class?.name ?? "", "vi"),
      ),
    [student],
  );

  if (isLoading) {
    return <StudentDashboardSkeleton />;
  }

  if (isError || !student) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Không tải được thông tin học sinh hiện tại.";

    return (
      <div className="rounded-[1.75rem] border border-error/30 bg-error/10 px-5 py-6 shadow-sm">
        <p className="text-sm font-medium text-error">{message}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Về trang chủ
          </Link>
          <Link
            href="/user-profile"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Xem hồ sơ cá nhân
          </Link>
        </div>
      </div>
    );
  }

  const normalizedStatus = normalizeStatus(student.status);
  const initials = (student.fullName?.trim() || student.email || "?").charAt(0).toUpperCase();
  const sePayStaticQrErrorMessage =
    (sePayStaticQrError as { response?: { data?: { message?: string } } } | null)?.response?.data?.message ??
    (sePayStaticQrError ? "Không tải được QR SePay. Vui lòng thử lại sau." : null);

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-6">
      {/* Balance popup */}
      <StudentBalancePopup
        key={`${student.id}-${balancePopupMode ?? "closed"}`}
        open={balancePopupMode !== null}
        mode={balancePopupMode ?? "topup"}
        student={{
          id: student.id,
          fullName: student.fullName,
          accountBalance: student.accountBalance,
        }}
        directBalanceChangeEnabled={false}
        sePayStaticQr={sePayStaticQr ?? null}
        isSePayStaticQrLoading={isSePayStaticQrLoading}
        sePayStaticQrErrorMessage={sePayStaticQrErrorMessage}
        onClose={() => setBalancePopupMode(null)}
      />

      {/* Wallet transactions history popup */}
      <StudentWalletHistoryPopup
        key={`${student.id}-${walletHistoryOpen ? "open" : "closed"}`}
        open={walletHistoryOpen}
        studentId={student.id}
        studentName={student.fullName || "học sinh"}
        currentBalance={student.accountBalance ?? 0}
        onClose={() => setWalletHistoryOpen(false)}
        loadTransactions={({ limit }) => getMyStudentWalletHistory({ limit })}
      />

      <QueryRefreshStrip
        active={isStudentFetching && !isLoading}
        label="Đang đồng bộ dữ liệu học sinh mới nhất…"
        className="mb-1"
      />

      {/* Main Student Header banner */}
      <header className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl sm:text-2xl font-bold text-primary ring-2 ring-primary/20"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary truncate">
                  {student.fullName || "Học sinh"}
                </h1>
                <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success ring-1 ring-success/20">
                  {STATUS_LABELS[normalizedStatus]}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-muted truncate">
                {student.email || "Chưa có email tài khoản"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/user-profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-secondary/60 px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <svg className="size-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Hồ sơ & Lịch thi
            </Link>
          </div>
        </div>
      </header>

      {/* Top summary & Wallet card */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <StudentWalletCard
            balance={student.accountBalance ?? 0}
            onTopUp={() => setBalancePopupMode("topup")}
            onOpenHistory={() => setWalletHistoryOpen(true)}
          />
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Lớp đang tham gia
            </p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {classItems.length} <span className="text-sm font-normal text-text-muted">lớp học</span>
            </p>
          </div>
          <div className="border-t border-border-subtle pt-3 text-xs text-text-muted">
            Cập nhật lần cuối: <span className="font-medium text-text-secondary">{formatDate(student.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Enrolled Classes List */}
      <section className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Danh sách lớp học</h2>
            <p className="text-sm text-text-muted">
              Chọn lớp học để xem lịch sử buổi học, video bài giảng recording và chuyên đề kiến thức.
            </p>
          </div>
        </div>

        {classItems.length > 0 ? (
          <div className="grid gap-3 sm:gap-4">
            {classItems.map((item) => (
              <Link
                key={item.class.id}
                href={`/student/classes/${item.class.id}`}
                className="group relative flex flex-col gap-3 rounded-xl border border-border-default bg-bg-secondary/40 p-4 transition-all duration-200 hover:border-primary/50 hover:bg-bg-secondary hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={cn(
                      "mt-1.5 size-2.5 shrink-0 rounded-full",
                      item.class.status === "running" ? "bg-success" : "bg-text-muted",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
                        {item.class.name}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1",
                          getTuitionSourceClass(item.tuitionPackageSource),
                        )}
                      >
                        {getTuitionSourceLabel(item.tuitionPackageSource)}
                      </span>
                      <span className="inline-flex rounded-full bg-bg-tertiary px-2 py-0.5 text-[11px] text-text-muted">
                        {getClassStatusLabel(item.class.status)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <div>
                        <span className="text-text-muted">Học phí: </span>
                        <span className="font-semibold text-text-primary">
                          {formatTuitionPerSession(item.effectiveTuitionPerSession)}/buổi
                        </span>
                      </div>
                      <span className="text-border-default" aria-hidden>•</span>
                      <div>
                        <span className="text-text-muted">Gói học phí: </span>
                        <span className="font-medium text-text-primary">
                          {formatTuitionPackage(item)}
                        </span>
                      </div>
                      <span className="text-border-default" aria-hidden>•</span>
                      <div>
                        <span className="text-text-muted">Đã vào học: </span>
                        <span className="font-semibold text-text-primary">
                          {item.totalAttendedSession ?? 0} buổi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-border-subtle sm:border-t-0">
                  <span className="text-xs font-semibold text-primary group-hover:underline inline-flex items-center gap-1">
                    Vào lớp học
                    <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/30 p-8 text-center">
            <div className="size-12 rounded-full bg-bg-tertiary text-text-muted mx-auto flex items-center justify-center mb-3">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-primary">
              Bạn chưa có lớp học nào
            </p>
            <p className="mt-1 text-xs text-text-muted max-w-sm mx-auto">
              Khi trung tâm phân công lớp học, danh sách lớp sẽ tự động hiển thị tại đây.
            </p>
          </div>
        )}
      </section>

      {/* Online Judge section */}
      <OjProgressSection studentName={student.fullName ?? ""} />
    </div>
  );
}
