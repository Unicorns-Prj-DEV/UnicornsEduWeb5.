"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as staffApi from "@/lib/apis/staff.api";
import { StaffCard, StaffDetailRow } from "@/components/admin/staff";

type StaffStatus = staffApi.StaffStatus;
type StaffDetail = staffApi.StaffDetail;

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

const STATUS_LABELS: Record<StaffStatus, string> = {
  active: "Hoạt động",
  inactive: "Ngừng",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Giáo viên",
  lesson_plan: "Giáo án",
  lesson_plan_head: "Trưởng nhóm giáo án",
  accountant: "Kế toán",
  communication: "Truyền thông",
  communication_head: "Trưởng truyền thông",
  customer_care: "CSKH",
  customer_care_head: "Trưởng CSKH",
};

export default function AdminStaffDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const {
    data: staff,
    isLoading,
    isError,
    error,
  } = useQuery<StaffDetail>({
    queryKey: ["staff", "detail", id],
    queryFn: () => staffApi.getStaffById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
          <div className="h-64 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
        </div>
        <p className="sr-only" aria-live="polite" aria-busy="true">
          Đang tải…
        </p>
      </div>
    );
  }

  if (!id || isError || !staff) {
    const message = !id
      ? "Thiếu mã nhân sự."
      : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (error as Error)?.message ??
        "Không tìm thấy nhân sự.";

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <Link
          href="/admin/staff"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại danh sách nhân sự
        </Link>
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
          <p>{message}</p>
        </div>
      </div>
    );
  }

  const province = staff.user?.province?.trim() || "—";
  const classes = staff.classTeachers?.map((ct) => ct.class.name).filter(Boolean) || [];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <Link
        href="/admin/staff"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Quay lại danh sách nhân sự
      </Link>

      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block size-3 shrink-0 rounded-full ${staff.status === "active" ? "bg-warning" : "bg-text-muted"}`}
            title={STATUS_LABELS[staff.status]}
            aria-hidden
          />
          <h1 className="text-xl font-semibold text-text-primary">{staff.fullName?.trim() || "Nhân sự"}</h1>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <StaffCard title="Thông tin cơ bản">
          <dl className="divide-y divide-border-subtle">
            <StaffDetailRow label="Ngày sinh" value={formatDate(staff.birthDate)} />
            <StaffDetailRow label="Tỉnh / Thành phố" value={province} />
            <StaffDetailRow label="Trường đại học" value={staff.university?.trim()} />
            <StaffDetailRow label="Mô tả chuyên môn" value={staff.specialization?.trim()} />
          </dl>
        </StaffCard>

        <section
          className="rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5"
          aria-labelledby="income-stats-title"
        >
          <h2
            id="income-stats-title"
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted"
          >
            Thống kê thu nhập
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-left text-sm">
              <caption className="sr-only">Bảng thống kê thu nhập nhân sự</caption>
              <thead>
                <tr className="border-b border-border-default bg-bg-secondary">
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                    Tổng tháng
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                    Chưa nhận
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                    Đã nhận
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                    Tổng năm
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary">
                  <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                </tr>
                <tr className="border-b border-border-default bg-bg-tertiary">
                  <td
                    colSpan={4}
                    className="py-2 pr-4 pl-4 text-xs font-medium uppercase tracking-wide text-text-muted"
                  >
                    Trước khấu trừ
                  </td>
                </tr>
                <tr className="border-b border-border-default bg-bg-tertiary">
                  <th scope="col" className="py-2 pr-4 text-left text-xs font-medium text-text-muted">
                    Tổng tháng (cũ)
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                    Chưa nhận (cũ)
                  </th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-text-muted">
                    Đã nhận (cũ)
                  </th>
                  <th scope="col" className="px-4 py-2" />
                </tr>
                <tr className="border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary">
                  <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                  <td className="px-4 py-3 text-text-muted">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-text-muted" aria-live="polite">
            Đang phát triển. Chưa có công thức tính toán; giá trị hiển thị là 0.
          </p>
        </section>

        <StaffCard title="Lớp phụ trách">
          {classes.length === 0 ? (
            <p className="text-text-muted">Chưa gán lớp nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border-default bg-bg-secondary">
                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                      Lớp
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                      Tổng nhận
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                      Chưa nhận
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                      Đã nhận
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((name) => (
                    <tr
                      key={name}
                      className="border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary"
                    >
                      <td className="px-4 py-3 text-text-primary">{name}</td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-text-muted">
            Đang phát triển. Các công thức về tổng nhận / chưa nhận / đã nhận sẽ được bổ sung sau; hiện tại hiển thị 0.
          </p>
        </StaffCard>

        <StaffCard title="Công việc khác">
          {(() => {
            const otherRoles = (staff.roles ?? []).filter((r) => r !== "teacher");
            if (otherRoles.length === 0) {
              return <p className="text-text-muted">Chưa có công việc khác (role ngoài giáo viên).</p>;
            }
            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                    <caption className="sr-only">Bảng công việc khác theo role</caption>
                    <thead>
                      <tr className="border-b border-border-default bg-bg-secondary">
                        <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                          Công việc
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                          Tổng nhận
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                          Chưa nhận
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                          Đã nhận
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherRoles.map((role) => (
                        <tr
                          key={role}
                          className="border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary"
                        >
                          <td className="px-4 py-3 text-text-primary">{ROLE_LABELS[role] ?? role}</td>
                          <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                          <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                          <td className="px-4 py-3 tabular-nums text-text-primary">0</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-text-muted">
                  Đang phát triển. Các công thức về tổng nhận / chưa nhận / đã nhận sẽ được bổ sung sau; hiện tại hiển thị 0.
                </p>
              </>
            );
          })()}
        </StaffCard>
      </div>
    </div>
  );
}
