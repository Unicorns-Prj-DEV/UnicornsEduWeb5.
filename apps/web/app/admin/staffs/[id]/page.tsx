"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import * as staffApi from "@/lib/apis/staff.api";
import {
  EditStaffPopup,
  StaffBonusCard,
  StaffCard,
  StaffDetailRow,
  StaffQrCard,
  QrLinkPopup,
  SessionHistoryTableSkeleton,
  type MockBonus,
} from "@/components/admin/staff";
import { StaffDetail, StaffStatus } from "@/dtos/staff.dto";
import { formatCurrency } from "@/lib/class.helpers";
import * as sessionApi from "@/lib/apis/session.api";
import SessionHistoryTable from "@/components/admin/session/SessionHistoryTable";
import { SessionItem } from "@/dtos/session.dto";

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

  const { data: staff, isLoading, isError } = useQuery<StaffDetail>({
    queryKey: ["staff", "detail", id],
    queryFn: () => staffApi.getStaffById(id),
    enabled: !!id,
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, selectedMonthValue] = selectedMonth.split("-");

  const handleMonthChange = (delta: number) => {
    const [year, month] = selectedMonth.split("-");
    let newMonth = Number.parseInt(month, 10) + delta;
    let newYear = Number.parseInt(year, 10);

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const selectedMonthLabel = `Tháng ${Number.parseInt(selectedMonthValue, 10)}/${selectedYear}`;

  const queryClient = useQueryClient();
  const {
    data: sessionsInCurrentMonth = [],
    isLoading: isSessionsLoading,
    isError: isSessionsError,
  } = useQuery<SessionItem[]>({
    queryKey: ["sessions", "staff", id, selectedYear, selectedMonthValue],
    queryFn: () =>
      sessionApi.getSessionsByStaffId(id, {
        month: selectedMonthValue,
        year: selectedYear,
      }),
    enabled: !!id,
  });

  const handleSessionUpdated = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["sessions", "staff", id, selectedYear, selectedMonthValue],
    });
  }, [queryClient, id, selectedYear, selectedMonthValue]);

  const getTeachersForClass = useCallback(async (classId: string) => {
    const detail = await classApi.getClassById(classId);
    return (detail.teachers ?? []).map((t) => ({ id: t.id, fullName: t.fullName }));
  }, []);

  const getClassStudents = useCallback(async (classId: string) => {
    const detail = await classApi.getClassById(classId);
    return (detail.students ?? []).map((s) => ({ id: s.id, fullName: s.fullName }));
  }, []);

  const {
    data: sessionsInCurrentYear = [],
  } = useQuery<SessionItem[]>({
    queryKey: ["sessions", "staff", "year", id, selectedYear],
    queryFn: async () => {
      const months = Array.from({ length: 12 }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      );

      const sessionsByMonth = await Promise.all(
        months.map((month) =>
          sessionApi.getSessionsByStaffId(id, {
            month,
            year: selectedYear,
          }),
        ),
      );

      const seenIds = new Set<string>();
      const deduplicatedSessions = sessionsByMonth.flat().filter((session) => {
        if (seenIds.has(session.id)) {
          return false;
        }
        seenIds.add(session.id);
        return true;
      });

      return deduplicatedSessions;
    },
    enabled: !!id,
  });

  const resolvedQrLink = useMemo(() => {
    const link =
      (staff as { qrPaymentLink?: string } | undefined)?.qrPaymentLink ||
      (staff as { qr_payment_link?: string } | undefined)?.qr_payment_link ||
      (staff as { bankQRLink?: string } | undefined)?.bankQRLink ||
      (staff as { bank_qr_link?: string } | undefined)?.bank_qr_link;
    const normalized = link?.trim();
    return normalized ? normalized : null;
  }, [staff]);

  const province = staff?.user?.province || "—";
  const classes =
    staff?.classTeachers
      ?.map((ct: { class: { id: string; name: string } }) => ({
        id: ct.class.id,
        name: ct.class.name,
      }))
      .filter((item) => item.id && item.name) || [];

  const classAllowanceItems = Array.isArray(staff?.classAllowance)
    ? staff.classAllowance
    : [];
  const classAllowanceByClassId = classAllowanceItems.reduce<
    Record<string, { paid: number; unpaid: number }>
  >((acc, item) => {
    const amount =
      typeof item.total_allowance === "number"
        ? item.total_allowance
        : Number(item.total_allowance ?? 0);

    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const current = acc[item.class_id] ?? { paid: 0, unpaid: 0 };
    const isPaid = item.teacher_payment_status === "paid";
    const nextValue = {
      paid: current.paid + (isPaid ? safeAmount : 0),
      unpaid: current.unpaid + (isPaid ? 0 : safeAmount),
    };

    return {
      ...acc,
      [item.class_id]: nextValue,
    };
  }, {});

  const sessionMonthlyTotals = useMemo(() => {
    return sessionsInCurrentMonth.reduce(
      (acc, session) => {
        const amountRaw =
          typeof session.allowanceAmount === "number"
            ? session.allowanceAmount
            : Number(session.allowanceAmount ?? 0);
        const safeAmount = Number.isFinite(amountRaw) ? amountRaw : 0;
        const isPaid = (session.teacherPaymentStatus ?? "").toLowerCase() === "paid";

        return {
          total: acc.total + safeAmount,
          paid: acc.paid + (isPaid ? safeAmount : 0),
          unpaid: acc.unpaid + (isPaid ? 0 : safeAmount),
        };
      },
      { total: 0, paid: 0, unpaid: 0 },
    );
  }, [sessionsInCurrentMonth]);

  const sessionYearTotal = useMemo(() => {
    return sessionsInCurrentYear.reduce((total, session) => {
      const amountRaw =
        typeof session.allowanceAmount === "number"
          ? session.allowanceAmount
          : Number(session.allowanceAmount ?? 0);
      const safeAmount = Number.isFinite(amountRaw) ? amountRaw : 0;

      return total + safeAmount;
    }, 0);
  }, [sessionsInCurrentYear]);


  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6" aria-busy="true" aria-live="polite">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
        <div className="mb-6 flex h-8 w-64 animate-pulse rounded bg-bg-tertiary" />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-36 animate-pulse rounded bg-bg-tertiary" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-bg-tertiary" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-bg-tertiary" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-28 animate-pulse rounded bg-bg-tertiary" />
            <div className="h-40 w-full animate-pulse rounded bg-bg-tertiary" />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border-default bg-bg-surface p-4">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-bg-tertiary" />
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
            <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-36 animate-pulse rounded bg-bg-tertiary" />
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-bg-tertiary" />
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!id || isError || !staff) {
    const message = !id
      ? "Thiếu mã nhân sự."
      : "Không tìm thấy hoặc không tải được thông tin nhân sự.";

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
            qrLink={qrLink ?? resolvedQrLink}
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
                  <td className="px-4 py-3 tabular-nums text-text-primary">{formatCurrency(sessionMonthlyTotals.total)}</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">{formatCurrency(sessionMonthlyTotals.unpaid)}</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">{formatCurrency(sessionMonthlyTotals.paid)}</td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">{formatCurrency(sessionYearTotal)}</td>
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
            Tổng hợp từ lịch sử session hiện có của gia sư. Dòng &quot;Trước khấu trừ&quot; vẫn đang phát triển.
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
                    {classes.map((item) => {
                      const allowance = classAllowanceByClassId[item.id] ?? {
                        paid: 0,
                        unpaid: 0,
                      };
                      const total = allowance.paid + allowance.unpaid;

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                        >
                          <td className="px-4 py-3 text-text-primary">{item.name}</td>
                          <td className="px-4 py-3 tabular-nums text-text-primary">
                            {formatCurrency(total)}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-text-primary">
                            {formatCurrency(allowance.unpaid)}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-text-primary">
                            {formatCurrency(allowance.paid)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

        <StaffCard title="Lịch sử buổi học">
          <div className="mb-4 flex items-center justify-center gap-3 rounded-lg border border-border-default bg-bg-secondary/40 px-3 py-2">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border-default bg-bg-surface text-text-primary transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Tháng trước"
              title="Tháng trước"
            >
              ◀
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">{selectedMonthLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              className="inline-flex size-8 items-center justify-center rounded-md border border-border-default bg-bg-surface text-text-primary transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Tháng sau"
              title="Tháng sau"
            >
              ▶
            </button>
          </div>

          {isSessionsLoading ? (
            <SessionHistoryTableSkeleton rows={1} entityMode="class" showActionsColumn />
          ) : (
            <SessionHistoryTable
              sessions={sessionsInCurrentMonth}
              entityMode="class"
              emptyText="Không có buổi học trong tháng này."
              onSessionUpdated={handleSessionUpdated}
              getTeachersForClass={getTeachersForClass}
              getClassStudents={getClassStudents}
            />
          )}
          {isSessionsError ? (
            <p className="mt-3 text-sm text-error" role="alert">
              Không tải được lịch sử buổi học.
            </p>
          ) : null}
        </StaffCard>
      </div>

      <QrLinkPopup
        open={qrPopupOpen}
        onClose={() => setQrPopupOpen(false)}
        currentLink={qrLink ?? resolvedQrLink ?? ""}
        onSave={(link) => {
          setQrLink(link || null);
          setQrPopupOpen(false);
        }}
      />
    </div>
  );
}
