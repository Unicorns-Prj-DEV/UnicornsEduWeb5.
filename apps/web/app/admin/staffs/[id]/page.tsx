"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as staffApi from "@/lib/apis/staff.api";
import {
  EditStaffPopup,
  StaffBonusCard,
  StaffCard,
  StaffDetailRow,
  StaffQrCard,
  QrLinkPopup,
  type MockBonus,
} from "@/components/admin/staff";
import { StaffDetail, StaffStatus } from "@/dtos/staff.dto";

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

/** Mock thưởng – dùng khi chưa kết nối BE */
const INITIAL_MOCK_BONUSES: MockBonus[] = [
  { id: "b1", workType: "Thưởng chuyên cần", status: "paid", amount: 500000 },
  { id: "b2", workType: "Thưởng chất lượng", status: "unpaid", amount: 300000 },
];

export default function AdminStaffDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrPopupOpen, setQrPopupOpen] = useState(false);
  const [bonuses, setBonuses] = useState<MockBonus[]>(() => INITIAL_MOCK_BONUSES);

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

  useEffect(() => {
    if (staff) {
      const link =
        (staff as { qrPaymentLink?: string }).qrPaymentLink ||
        (staff as { qr_payment_link?: string }).qr_payment_link ||
        (staff as { bankQRLink?: string }).bankQRLink ||
        (staff as { bank_qr_link?: string }).bank_qr_link;
      if (link?.trim()) setQrLink(link.trim());
    }
  }, [staff]);

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
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại danh sách nhân sự
        </button>
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
          <p>{message}</p>
        </div>
      </div>
    );
  }

  const province = staff.user?.province || "—";
  const classes = staff.classTeachers?.map((ct: { class: { name: string } }) => ct.class.name).filter(Boolean) || [];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="hover:cursor-pointer mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Quay lại danh sách nhân sự
      </button>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex shrink-0">
            <div
              className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-bg-tertiary ring-2 ring-border-default text-2xl font-semibold text-text-primary"
              aria-hidden
            >
              {(staff.fullName?.trim() || staff.user?.email || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
            <span
              className={`absolute bottom-0 right-0 block size-3 rounded-full border-2 border-bg-surface ${staff.status === "active" ? "bg-warning" : "bg-text-muted"}`}
              title={STATUS_LABELS[staff.status]}
              aria-hidden
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-text-primary">
                {staff.fullName?.trim() || "Nhân sự"}
              </h1>
              <button
                type="button"
                onClick={() => setEditPopupOpen(true)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted transition hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                aria-label="Chỉnh sửa thông tin nhân sự"
                title="Chỉnh sửa thông tin nhân sự"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(staff.roles ?? []).map((role) => (
                <span
                  key={role}
                  className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {ROLE_LABELS[role] ?? role}
                </span>
              ))}
              {(!staff.roles || staff.roles.length === 0) && (
                <span className="text-sm text-text-muted">Chưa có role</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <EditStaffPopup
        open={editPopupOpen}
        onClose={() => setEditPopupOpen(false)}
        staff={staff}
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <StaffCard title="Thông tin cơ bản">
            <dl className="divide-y divide-border-subtle">
              <StaffDetailRow label="Ngày sinh" value={formatDate(staff.birthDate)} />
              <StaffDetailRow label="Tỉnh / Thành phố" value={province} />
              <StaffDetailRow label="Trường đại học" value={staff.university?.trim()} />
              <StaffDetailRow label="Mô tả chuyên môn" value={staff.specialization?.trim()} />
            </dl>
          </StaffCard>
          <StaffQrCard
            qrLink={qrLink}
            onEditClick={() => setQrPopupOpen(true)}
          />
        </div>

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
                <tr className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary">
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
                <tr className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary">
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

        <div className="grid gap-4 lg:grid-cols-2">
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
                        className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
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
          <StaffBonusCard
            bonuses={bonuses}
            totalMonth={bonuses.reduce((s, b) => s + b.amount, 0)}
            paid={bonuses.filter((b) => b.status === "paid").reduce((s, b) => s + b.amount, 0)}
            unpaid={bonuses.filter((b) => b.status === "unpaid").reduce((s, b) => s + b.amount, 0)}
            onAddBonus={() => toast.info("Chức năng thêm thưởng đang phát triển.")}
            onEditBonus={() => toast.info("Chức năng chỉnh sửa thưởng đang phát triển.")}
            onDeleteBonus={(bid) => {
              setBonuses((prev) => prev.filter((b) => b.id !== bid));
              toast.success("Đã xóa thưởng.");
            }}
            canManage
          />
        </div>

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
                          className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
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

      <QrLinkPopup
        open={qrPopupOpen}
        onClose={() => setQrPopupOpen(false)}
        currentLink={qrLink ?? ""}
        onSave={(link) => {
          setQrLink(link || null);
          setQrPopupOpen(false);
        }}
      />
    </div>
  );
}
