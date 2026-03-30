"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import * as bonusApi from "@/lib/apis/bonus.api";
import * as staffApi from "@/lib/apis/staff.api";
import {
  EditStaffPopup,
  StaffBonusCard,
  StaffCard,
  StaffDetailRow,
  StaffQrCard,
  QrLinkPopup,
  SessionHistoryTableSkeleton,
} from "@/components/admin/staff";
import { BonusListItem } from "@/dtos/bonus.dto";
import { StaffDetail, StaffIncomeSummary, StaffStatus } from "@/dtos/staff.dto";
import { formatCurrency } from "@/lib/class.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";
import {
  buildAdminLikePath,
  buildStaffRoleDetailHref,
  resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";
import * as sessionApi from "@/lib/apis/session.api";
import SessionHistoryTable from "@/components/admin/session/SessionHistoryTable";
import MonthNav from "@/components/admin/MonthNav";
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
const STAFF_ROLE_WORK_TYPE_OPTIONS = Object.values(ROLE_LABELS);

type BonusFormState = {
  workTypeOption: string;
  amount: string;
  status: "pending" | "paid";
  note: string;
};

type BonusRecord = {
  id: string;
  workType: string;
  amount: number;
  status: "paid" | "pending";
  note: string;
};

const DEFAULT_ROLE_WORK_TYPE = "Giáo viên";
const RECENT_UNPAID_DAYS = 14;

const DEFAULT_BONUS_FORM: BonusFormState = {
  workTypeOption: DEFAULT_ROLE_WORK_TYPE,
  amount: "",
  status: "pending",
  note: "",
};

const EMPTY_AMOUNT_SUMMARY = {
  total: 0,
  paid: 0,
  unpaid: 0,
};

function normalizeMoneyAmount(value?: number | string | null): number {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeBonusRecord(item: BonusListItem): BonusRecord {
  const rawStatus = (item.status ?? "").toString().toLowerCase();

  return {
    id: item.id,
    workType: item.workType?.trim() || "Khác",
    amount: normalizeMoneyAmount(item.amount),
    status: rawStatus === "paid" ? "paid" : "pending",
    note: item.note?.trim() || "",
  };
}

export default function AdminStaffDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const pathname = usePathname();
  const routeBase = resolveAdminLikeRouteBase(pathname);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrPopupOpen, setQrPopupOpen] = useState(false);
  const [addBonusPopupOpen, setAddBonusPopupOpen] = useState(false);
  const [bonusFormMode, setBonusFormMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);
  const [bonusForm, setBonusForm] =
    useState<BonusFormState>(DEFAULT_BONUS_FORM);
  const [workTypeMenuOpen, setWorkTypeMenuOpen] = useState(false);
  const [workTypeSearch, setWorkTypeSearch] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [depositPopupOpen, setDepositPopupOpen] = useState(false);
  const workTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    data: staff,
    isLoading,
    isError,
  } = useQuery<StaffDetail>({
    queryKey: ["staff", "detail", id],
    queryFn: () => staffApi.getStaffById(id),
    enabled: !!id,
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [monthPopupOpen, setMonthPopupOpen] = useState(false);
  const [selectedYear, selectedMonthValue] = selectedMonth.split("-");

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
    placeholderData: keepPreviousData,
  });

  const {
    data: incomeSummary,
    isError: isIncomeSummaryError,
    isLoading: isIncomeSummaryLoading,
  } = useQuery<StaffIncomeSummary>({
    queryKey: [
      "staff",
      "income-summary",
      id,
      selectedYear,
      selectedMonthValue,
      RECENT_UNPAID_DAYS,
    ],
    queryFn: () =>
      staffApi.getStaffIncomeSummary(id, {
        month: selectedMonthValue,
        year: selectedYear,
        days: RECENT_UNPAID_DAYS,
      }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  const handleSessionUpdated = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["sessions", "staff", id, selectedYear, selectedMonthValue],
    });
    queryClient.invalidateQueries({
      queryKey: ["staff", "income-summary", id],
    });
    queryClient.invalidateQueries({
      queryKey: ["staff", "detail", id],
    });
  }, [queryClient, id, selectedYear, selectedMonthValue]);

  const handleStaffEditSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["staff", "detail", id] });
    queryClient.invalidateQueries({ queryKey: ["staff", "list"] });
  }, [queryClient, id]);

  const getTeachersForClass = useCallback(async (classId: string) => {
    const detail = await classApi.getClassById(classId);
    return (detail.teachers ?? []).map((t) => ({
      id: t.id,
      fullName: t.fullName,
    }));
  }, []);

  const getClassStudents = useCallback(async (classId: string) => {
    const detail = await classApi.getClassById(classId);
    return (detail.students ?? []).map((s) => ({
      id: s.id,
      fullName: s.fullName,
      tuitionFee: s.effectiveTuitionPerSession ?? null,
    }));
  }, []);

  const {
    data: bonusListResponse,
    isError: isBonusError,
    isLoading: isBonusLoading,
  } = useQuery({
    queryKey: ["bonus", "list", "staff", id, selectedMonth],
    queryFn: () =>
      bonusApi.getBonuses({
        page: 1,
        limit: 100,
        staffId: id,
        month: selectedMonth,
      }),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });

  const bonusRecords = useMemo<BonusRecord[]>(() => {
    return (bonusListResponse?.data ?? []).map(normalizeBonusRecord);
  }, [bonusListResponse]);

  const bonuses = useMemo<
    {
      id: string;
      workType: string;
      status: "paid" | "unpaid" | "deposit";
      amount: number;
    }[]
  >(
    () =>
      bonusRecords.map((item) => ({
        id: item.id,
        workType: item.workType,
        amount: item.amount,
        status: item.status === "paid" ? "paid" : "unpaid",
      })),
    [bonusRecords],
  );

  const workTypeOptions = useMemo(() => {
    return STAFF_ROLE_WORK_TYPE_OPTIONS;
  }, []);

  const filteredWorkTypeOptions = useMemo(() => {
    const needle = workTypeSearch.trim().toLowerCase();
    if (!needle) return workTypeOptions;
    return workTypeOptions.filter((item) =>
      item.toLowerCase().includes(needle),
    );
  }, [workTypeOptions, workTypeSearch]);

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
  const classMonthlySummaries = incomeSummary?.classMonthlySummaries ?? [];
  const monthlyIncomeTotals =
    incomeSummary?.monthlyIncomeTotals ?? EMPTY_AMOUNT_SUMMARY;
  const yearIncomeTotal = incomeSummary?.yearIncomeTotal ?? 0;
  const depositYearTotal = incomeSummary?.depositYearTotal ?? 0;
  const depositByClass = incomeSummary?.depositYearByClass ?? [];
  const bonusTotals = incomeSummary?.bonusMonthlyTotals ?? EMPTY_AMOUNT_SUMMARY;
  const otherRoleSummaries = incomeSummary?.otherRoleSummaries ?? [];

  const deleteBonusMutation = useMutation({
    mutationFn: (bonusId: string) => bonusApi.deleteBonusById(bonusId),
    onSuccess: async () => {
      toast.success("Đã xóa thưởng.");
      await queryClient.invalidateQueries({
        queryKey: ["bonus", "list", "staff", id, selectedMonth],
      });
      await queryClient.invalidateQueries({
        queryKey: ["staff", "income-summary", id],
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (err as Error)?.message ??
        "Không thể xóa thưởng.";
      toast.error(msg);
    },
  });

  const createBonusMutation = useMutation({
    mutationFn: bonusApi.createBonus,
    onSuccess: async () => {
      toast.success("Đã thêm thưởng.");
      setAddBonusPopupOpen(false);
      setBonusForm(DEFAULT_BONUS_FORM);
      await queryClient.invalidateQueries({
        queryKey: ["bonus", "list", "staff", id, selectedMonth],
      });
      await queryClient.invalidateQueries({
        queryKey: ["staff", "income-summary", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["staff", "detail", id],
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (err as Error)?.message ??
        "Không thể thêm thưởng.";
      toast.error(msg);
    },
  });

  const updateBonusMutation = useMutation({
    mutationFn: bonusApi.updateBonus,
    onSuccess: async () => {
      toast.success("Đã cập nhật thưởng.");
      setAddBonusPopupOpen(false);
      setBonusFormMode("create");
      setEditingBonusId(null);
      setBonusForm(DEFAULT_BONUS_FORM);
      await queryClient.invalidateQueries({
        queryKey: ["bonus", "list", "staff", id, selectedMonth],
      });
      await queryClient.invalidateQueries({
        queryKey: ["staff", "income-summary", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["staff", "detail", id],
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật thưởng.";
      toast.error(msg);
    },
  });

  const openAddBonusPopup = () => {
    setBonusFormMode("create");
    setEditingBonusId(null);
    setBonusForm(DEFAULT_BONUS_FORM);
    setWorkTypeMenuOpen(false);
    setWorkTypeSearch("");
    setStatusMenuOpen(false);
    setAddBonusPopupOpen(true);
  };

  const openEditBonusPopup = (bonusId: string) => {
    const target = bonusRecords.find((item) => item.id === bonusId);
    if (!target) {
      toast.error("Không tìm thấy thưởng để chỉnh sửa.");
      return;
    }

    const isExistingOption = workTypeOptions.includes(target.workType);
    setBonusFormMode("edit");
    setEditingBonusId(target.id);
    setBonusForm({
      workTypeOption: isExistingOption
        ? target.workType
        : DEFAULT_ROLE_WORK_TYPE,
      amount: String(target.amount),
      status: target.status,
      note: target.note,
    });
    setWorkTypeMenuOpen(false);
    setWorkTypeSearch("");
    setStatusMenuOpen(false);
    setAddBonusPopupOpen(true);
  };

  const closeAddBonusPopup = () => {
    if (createBonusMutation.isPending || updateBonusMutation.isPending) return;
    setAddBonusPopupOpen(false);
    setBonusFormMode("create");
    setEditingBonusId(null);
    setBonusForm(DEFAULT_BONUS_FORM);
    setWorkTypeMenuOpen(false);
    setWorkTypeSearch("");
    setStatusMenuOpen(false);
  };

  const resolveWorkType = () => {
    return bonusForm.workTypeOption.trim();
  };

  useEffect(() => {
    if (!addBonusPopupOpen || (!workTypeMenuOpen && !statusMenuOpen)) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!workTypeMenuRef.current?.contains(event.target as Node)) {
        setWorkTypeMenuOpen(false);
      }
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkTypeMenuOpen(false);
        setStatusMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [addBonusPopupOpen, workTypeMenuOpen, statusMenuOpen]);

  const handleSubmitBonus = async () => {
    const workType = resolveWorkType();
    if (!workType) {
      toast.error("Vui lòng nhập loại công việc.");
      return;
    }

    const parsedAmount = Number(bonusForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      toast.error("Số tiền không hợp lệ.");
      return;
    }

    if (bonusFormMode === "create") {
      if (
        typeof crypto === "undefined" ||
        typeof crypto.randomUUID !== "function"
      ) {
        toast.error("Không thể tạo mã thưởng. Vui lòng thử lại.");
        return;
      }

      try {
        await createBonusMutation.mutateAsync({
          id: crypto.randomUUID(),
          staffId: id,
          workType,
          month: selectedMonth,
          amount: Math.round(parsedAmount),
          status: bonusForm.status,
          note: bonusForm.note.trim() || undefined,
        });
      } catch {
        // toast lỗi đã xử lý trong onError
      }
      return;
    }

    if (!editingBonusId) {
      toast.error("Không tìm thấy thưởng để chỉnh sửa.");
      return;
    }

    try {
      await updateBonusMutation.mutateAsync({
        id: editingBonusId,
        workType,
        month: selectedMonth,
        amount: Math.round(parsedAmount),
        status: bonusForm.status,
        note: bonusForm.note.trim() || undefined,
      });
    } catch {
      // toast lỗi đã xử lý trong onError
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
        aria-busy="true"
        aria-live="polite"
      >
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
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:min-h-0 sm:min-w-0 sm:px-0"
        >
          <svg
            className="size-4 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="hidden sm:inline">Quay lại danh sách nhân sự</span>
        </button>
        <div
          className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error"
          role="alert"
        >
          <p>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:min-h-0 sm:min-w-0 sm:px-0"
      >
        <svg
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="hidden sm:inline">Quay lại danh sách nhân sự</span>
      </button>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative flex shrink-0">
            <div
              className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-bg-tertiary ring-2 ring-border-default text-xl font-semibold text-text-primary sm:size-16 sm:text-2xl"
              aria-hidden
            >
              {(staff.fullName?.trim() || staff.user?.email || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
            <span
              className={`absolute bottom-0 right-0 block size-3 rounded-full border-2 border-bg-surface ${staff.status === "active" ? "bg-success" : "bg-error"}`}
              title={STATUS_LABELS[staff.status]}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 truncate text-lg font-semibold text-text-primary sm:text-xl">
                {staff.fullName?.trim() || "Nhân sự"}
              </h1>
              <button
                type="button"
                onClick={() => setEditPopupOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted transition hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:size-8"
                aria-label="Chỉnh sửa thông tin nhân sự"
                title="Chỉnh sửa thông tin nhân sự"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
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
        key={`${staff.id}:${editPopupOpen ? "open" : "closed"}`}
        open={editPopupOpen}
        onClose={() => setEditPopupOpen(false)}
        staff={staff}
        onSuccess={handleStaffEditSuccess}
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <StaffCard title="Thông tin cơ bản">
            <dl className="divide-y divide-border-subtle">
              <StaffDetailRow
                label="Ngày sinh"
                value={formatDate(staff.birthDate)}
              />
              <StaffDetailRow label="Tỉnh / Thành phố" value={province} />
              <StaffDetailRow
                label="Trường đại học"
                value={staff.university?.trim()}
              />
              <StaffDetailRow
                label="Mô tả chuyên môn"
                value={staff.specialization?.trim()}
              />
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2
              id="income-stats-title"
              className="text-sm font-semibold uppercase tracking-wide text-text-primary"
            >
              Thống kê thu nhập
            </h2>
            <div className="shrink-0 sm:pt-0.5">
              <MonthNav
                value={selectedMonth}
                onChange={setSelectedMonth}
                monthPopupOpen={monthPopupOpen}
                setMonthPopupOpen={setMonthPopupOpen}
              />
            </div>
          </div>
          <div className="mt-3 space-y-3 md:hidden">
            <div className="flex justify-between rounded-lg border border-border-default bg-bg-secondary/40 px-4 py-3">
              <span className="text-sm text-text-primary">Tổng tháng</span>
              <span className="tabular-nums text-sm font-semibold text-primary">
                {formatCurrency(monthlyIncomeTotals.total)}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border border-border-default bg-bg-secondary/40 px-4 py-3">
              <span className="text-sm text-text-primary">Chưa nhận</span>
              <span className="tabular-nums text-sm font-semibold text-error">
                {formatCurrency(monthlyIncomeTotals.unpaid)}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border border-border-default bg-bg-secondary/40 px-4 py-3">
              <span className="text-sm text-text-primary">Đã nhận</span>
              <span className="tabular-nums text-sm font-semibold text-success">
                {formatCurrency(monthlyIncomeTotals.paid)}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border border-border-default bg-bg-secondary/40 px-4 py-3">
              <span className="text-sm text-text-primary">Tổng năm</span>
              <span className="tabular-nums text-sm font-semibold text-warning">
                {formatCurrency(yearIncomeTotal)}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border border-border-default bg-bg-secondary/40 px-4 py-3">
              <span className="text-sm text-text-primary">Ghi cọc</span>
              {depositYearTotal > 0 ? (
                <button
                  type="button"
                  onClick={() => setDepositPopupOpen(true)}
                  className="tabular-nums text-sm font-semibold text-warning underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                  aria-label="Xem danh sách buổi cọc theo lớp"
                >
                  {formatCurrency(depositYearTotal)}
                </button>
              ) : (
                <span className="tabular-nums text-sm font-semibold text-text-muted">
                  0
                </span>
              )}
            </div>
          </div>
          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[400px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Bảng thống kê thu nhập nhân sự
              </caption>
              <thead className="bg-bg-secondary/50">
                <tr className="border-b border-border-default bg-bg-secondary/50">
                  <th
                    scope="col"
                    className="px-4 py-3 font-medium tabular-nums text-text-primary"
                  >
                    Tổng tháng
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-medium tabular-nums text-text-primary"
                  >
                    Chưa nhận
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-medium tabular-nums text-text-primary"
                  >
                    Đã nhận
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-medium tabular-nums text-text-primary"
                  >
                    Tổng năm
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 font-medium tabular-nums text-text-primary"
                  >
                    Ghi cọc
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary">
                  <td className="px-4 py-3 tabular-nums font-semibold text-primary">
                    {formatCurrency(monthlyIncomeTotals.total)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-error">
                    {formatCurrency(monthlyIncomeTotals.unpaid)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-success">
                    {formatCurrency(monthlyIncomeTotals.paid)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-warning">
                    {formatCurrency(yearIncomeTotal)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-warning">
                    {depositYearTotal > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDepositPopupOpen(true)}
                        className="underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                        aria-label="Xem danh sách buổi cọc theo lớp"
                      >
                        {formatCurrency(depositYearTotal)}
                      </button>
                    ) : (
                      <span className="text-text-muted">0</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-border-default bg-bg-tertiary">
                  <td
                    colSpan={5}
                    className="py-2 pr-4 pl-4 text-xs font-medium uppercase tracking-wide text-text-muted"
                  >
                    Trước khấu trừ
                  </td>
                </tr>
                <tr className="border-b border-border-default bg-bg-tertiary">
                  <th
                    scope="col"
                    className="py-2 pr-4 text-left text-xs font-medium text-text-muted"
                  >
                    Tổng tháng (cũ)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-text-muted"
                  >
                    Chưa nhận (cũ)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-text-muted"
                  >
                    Đã nhận (cũ)
                  </th>
                  <th scope="col" className="px-4 py-2" />
                  <th scope="col" className="px-4 py-2" />
                </tr>
                <tr className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary">
                  <td className="px-4 py-3 tabular-nums text-text-primary">
                    0
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">
                    0
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">
                    0
                  </td>
                  <td className="px-4 py-3 text-text-muted">—</td>
                  <td className="px-4 py-3 text-text-muted">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          {isIncomeSummaryError ? (
            <p className="mt-3 text-sm text-error" role="alert">
              Không tải được tổng hợp thu nhập từ backend.
            </p>
          ) : null}
          <p className="mt-3 text-xs text-text-muted" aria-live="polite">
            {isIncomeSummaryLoading && !incomeSummary
              ? "Đang tải tổng hợp thu nhập từ backend."
              : 'Tổng tháng, chưa nhận và đã nhận đang lấy từ backend sau khi cộng cả session lẫn thưởng tháng. Dòng "Trước khấu trừ" vẫn đang phát triển.'}
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <StaffCard title="Lớp phụ trách">
            {classMonthlySummaries.length === 0 ? (
              <p className="text-text-muted">Chưa gán lớp nào.</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {classMonthlySummaries.map((item) => {
                    return (
                      <div
                        key={item.classId}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          router.push(
                            buildAdminLikePath(
                              routeBase,
                              `classes/${encodeURIComponent(item.classId)}`,
                            ),
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(
                              buildAdminLikePath(
                                routeBase,
                                `classes/${encodeURIComponent(item.classId)}`,
                              ),
                            );
                          }
                        }}
                        className="cursor-pointer rounded-lg border border-border-default bg-bg-secondary px-4 py-3 transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <p className="font-medium text-text-primary">
                          {item.className}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                          <span>
                            Tổng:{" "}
                            <span className="font-semibold text-primary">
                              {formatCurrency(item.total)}
                            </span>
                          </span>
                          <span>
                            Chưa nhận:{" "}
                            <span className="font-semibold text-error">
                              {formatCurrency(item.unpaid)}
                            </span>
                          </span>
                          <span>
                            Đã nhận:{" "}
                            <span className="font-semibold text-success">
                              {formatCurrency(item.paid)}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-default bg-bg-secondary">
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary"
                        >
                          Lớp
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary tabular-nums"
                        >
                          Tổng nhận
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary tabular-nums"
                        >
                          Chưa nhận
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary tabular-nums"
                        >
                          Đã nhận
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classMonthlySummaries.map((item) => {
                        return (
                          <tr
                            key={item.classId}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              router.push(
                                buildAdminLikePath(
                                  routeBase,
                                  `classes/${encodeURIComponent(item.classId)}`,
                                ),
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(
                                  buildAdminLikePath(
                                    routeBase,
                                    `classes/${encodeURIComponent(item.classId)}`,
                                  ),
                                );
                              }
                            }}
                            className="cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            <td className="px-4 py-3 text-text-primary">
                              {item.className}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-primary">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-error">
                              {formatCurrency(item.unpaid)}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-success">
                              {formatCurrency(item.paid)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </StaffCard>
          <div className="space-y-2">
            <StaffBonusCard
              bonuses={bonuses}
              totalMonth={bonusTotals.total}
              paid={bonusTotals.paid}
              unpaid={bonusTotals.unpaid}
              onAddBonus={openAddBonusPopup}
              onEditBonus={(bonus) => openEditBonusPopup(bonus.id)}
              onDeleteBonus={(bid) => deleteBonusMutation.mutate(bid)}
              canManage
            />
            {isBonusLoading ? (
              <p className="text-sm text-text-muted" aria-live="polite">
                Đang tải dữ liệu thưởng...
              </p>
            ) : null}
            {isBonusError ? (
              <p className="text-sm text-error" role="alert">
                Không tải được dữ liệu thưởng.
              </p>
            ) : null}
          </div>
        </div>

        <StaffCard title="Công việc khác">
          {(() => {
            if (otherRoleSummaries.length === 0) {
              return (
                <p className="text-text-muted">
                  Chưa có công việc khác (role ngoài giáo viên).
                </p>
              );
            }
            return (
              <>
                <div className="space-y-3 md:hidden">
                  {otherRoleSummaries.map((item) => {
                    const detailHref = buildStaffRoleDetailHref(
                      routeBase,
                      item.role,
                      id,
                    );
                    const isInteractive = detailHref !== null;
                    return (
                      <div
                        key={item.role}
                        role={isInteractive ? "button" : undefined}
                        tabIndex={isInteractive ? 0 : undefined}
                        onClick={
                          isInteractive
                            ? () => router.push(detailHref)
                            : undefined
                        }
                        onKeyDown={
                          isInteractive
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  router.push(detailHref);
                                }
                              }
                            : undefined
                        }
                        className={`rounded-lg border border-border-default bg-bg-secondary px-4 py-3 ${isInteractive ? "cursor-pointer transition-colors hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-primary" : ""}`}
                      >
                        <p className="font-medium text-text-primary">
                          {item.label}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                          <span>
                            Tổng:{" "}
                            <span className="font-semibold text-primary">
                              {formatCurrency(item.total)}
                            </span>
                          </span>
                          <span>
                            Chưa nhận:{" "}
                            <span className="font-semibold text-error">
                              {formatCurrency(item.unpaid)}
                            </span>
                          </span>
                          <span>
                            Đã nhận:{" "}
                            <span className="font-semibold text-success">
                              {formatCurrency(item.paid)}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                    <caption className="sr-only">
                      Bảng công việc khác theo role
                    </caption>
                    <thead>
                      <tr className="border-b border-border-default bg-bg-secondary">
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary"
                        >
                          Công việc
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary tabular-nums"
                        >
                          Tổng nhận
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary tabular-nums"
                        >
                          Chưa nhận
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 font-medium text-text-primary tabular-nums"
                        >
                          Đã nhận
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherRoleSummaries.map((item) => {
                        const detailHref = buildStaffRoleDetailHref(
                          routeBase,
                          item.role,
                          id,
                        );
                        const isInteractive = detailHref !== null;
                        return (
                          <tr
                            key={item.role}
                            role={isInteractive ? "button" : undefined}
                            tabIndex={isInteractive ? 0 : undefined}
                            onClick={
                              isInteractive
                                ? () => router.push(detailHref)
                                : undefined
                            }
                            onKeyDown={
                              isInteractive
                                ? (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      router.push(detailHref);
                                    }
                                  }
                                : undefined
                            }
                            className={`border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary ${isInteractive ? "cursor-pointer" : ""}`}
                          >
                            <td className="px-4 py-3 text-text-primary">
                              {item.label}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-primary">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-error">
                              {formatCurrency(item.unpaid)}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-success">
                              {formatCurrency(item.paid)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </StaffCard>

        <StaffCard title="Lịch sử buổi học">
          <div className="min-w-0 overflow-x-auto">
            {isSessionsLoading ? (
              <SessionHistoryTableSkeleton
                rows={1}
                entityMode="class"
                showActionsColumn
              />
            ) : (
              <SessionHistoryTable
                sessions={sessionsInCurrentMonth}
                entityMode="class"
                emptyText="Không có buổi học trong tháng này."
                editorLayout="wide"
                enableBulkPaymentStatusEdit
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
          </div>
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

      {addBonusPopupOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden
            onClick={closeAddBonusPopup}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bonus-title"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-bg-surface p-4 shadow-xl sm:p-5"
          >
            <h2
              id="add-bonus-title"
              className="text-lg font-semibold text-text-primary"
            >
              {bonusFormMode === "create" ? "Thêm thưởng" : "Chỉnh sửa thưởng"}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Áp dụng cho {selectedMonthLabel}
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">
                  Loại công việc
                </span>
                <div className="relative" ref={workTypeMenuRef}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2 text-left text-sm text-text-primary transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    onClick={() => setWorkTypeMenuOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={workTypeMenuOpen}
                    aria-label="Chọn loại công việc"
                  >
                    <span className="truncate">{bonusForm.workTypeOption}</span>
                    <svg
                      className={`ml-2 size-4 shrink-0 text-text-muted transition-transform duration-200 ${workTypeMenuOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="m6 9 6 6 6-6"
                      />
                    </svg>
                  </button>

                  {workTypeMenuOpen ? (
                    <div
                      role="listbox"
                      aria-label="Danh sách công việc"
                      className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border-default bg-bg-surface shadow-lg"
                    >
                      <div className="border-b border-border-default p-2">
                        <input
                          type="search"
                          value={workTypeSearch}
                          onChange={(e) => setWorkTypeSearch(e.target.value)}
                          placeholder="Tìm công việc..."
                          className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        />
                      </div>
                      <div className="max-h-64 overflow-auto p-1">
                        {filteredWorkTypeOptions.map((item) => {
                          const isSelected = bonusForm.workTypeOption === item;
                          return (
                            <button
                              key={item}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm transition-colors duration-150 ${
                                isSelected
                                  ? "bg-primary/10 font-medium text-text-primary"
                                  : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                              }`}
                              onClick={() => {
                                setBonusForm((prev) => ({
                                  ...prev,
                                  workTypeOption: item,
                                }));
                                setWorkTypeMenuOpen(false);
                              }}
                            >
                              <span>{item}</span>
                            </button>
                          );
                        })}
                        {filteredWorkTypeOptions.length === 0 ? (
                          <p className="px-2 py-2 text-sm text-text-muted">
                            Không tìm thấy công việc phù hợp.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">
                  Số tiền
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={bonusForm.amount}
                  onChange={(e) =>
                    setBonusForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  placeholder="Ví dụ: 500000"
                  className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">
                  Trạng thái
                </span>
                <div className="relative" ref={statusMenuRef}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2 text-left text-sm text-text-primary transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    onClick={() => setStatusMenuOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={statusMenuOpen}
                    aria-label="Chọn trạng thái thanh toán"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${bonusForm.status === "paid" ? "bg-success" : "bg-warning"}`}
                        aria-hidden
                      />
                      {bonusForm.status === "paid"
                        ? "Đã thanh toán"
                        : "Chờ thanh toán"}
                    </span>
                    <svg
                      className={`ml-2 size-4 shrink-0 text-text-muted transition-transform duration-200 ${statusMenuOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="m6 9 6 6 6-6"
                      />
                    </svg>
                  </button>

                  {statusMenuOpen ? (
                    <div
                      role="listbox"
                      aria-label="Danh sách trạng thái thanh toán"
                      className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border-default bg-bg-surface p-1 shadow-lg"
                    >
                      {[
                        {
                          value: "pending" as const,
                          label: "Chờ thanh toán",
                          dot: "bg-warning",
                        },
                        {
                          value: "paid" as const,
                          label: "Đã thanh toán",
                          dot: "bg-success",
                        },
                      ].map((option) => {
                        const isSelected = bonusForm.status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm transition-colors duration-150 ${
                              isSelected
                                ? "bg-primary/10 font-medium text-text-primary"
                                : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                            }`}
                            onClick={() => {
                              setBonusForm((prev) => ({
                                ...prev,
                                status: option.value,
                              }));
                              setStatusMenuOpen(false);
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span
                                className={`size-2 rounded-full ${option.dot}`}
                                aria-hidden
                              />
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">
                  Ghi chú
                </span>
                <textarea
                  rows={3}
                  value={bonusForm.note}
                  onChange={(e) =>
                    setBonusForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="Ghi chú thêm (nếu có)"
                  className="w-full resize-none rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={closeAddBonusPopup}
                className="min-h-11 rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:py-2"
                disabled={
                  createBonusMutation.isPending || updateBonusMutation.isPending
                }
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitBonus}
                className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:py-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  createBonusMutation.isPending || updateBonusMutation.isPending
                }
              >
                {createBonusMutation.isPending || updateBonusMutation.isPending
                  ? "Đang lưu..."
                  : bonusFormMode === "create"
                    ? "Thêm thưởng"
                    : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {depositPopupOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
            aria-hidden
            onClick={() => setDepositPopupOpen(false)}
          />
          <div className="fixed inset-0 z-50 p-2 sm:p-4">
            <div className="mx-auto flex h-full w-full items-center max-w-2xl">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="deposit-list-title"
                className="flex max-h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-border-default bg-bg-surface p-4 shadow-2xl sm:p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3 border-b border-border-default/70 pb-4">
                  <div className="min-w-0">
                    <h2
                      id="deposit-list-title"
                      className="truncate text-lg font-semibold text-text-primary"
                    >
                      Buổi cọc theo lớp
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Tổng cọc năm {selectedYear}:{" "}
                      <span className="font-semibold tabular-nums text-warning">
                        {formatCurrency(depositYearTotal)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDepositPopupOpen(false)}
                    className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label="Đóng"
                  >
                    <svg
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 sm:pr-2">
                  {depositByClass.length === 0 ? (
                    <div className="rounded-xl border border-border-default bg-bg-secondary/40 px-4 py-6 text-center">
                      <p className="text-sm font-medium text-text-primary">
                        Chưa có buổi cọc.
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        Buổi cọc là session có trạng thái thanh toán là{" "}
                        <span className="font-medium">deposit</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {depositByClass.map((group) => (
                        <section
                          key={group.classId}
                          className="overflow-hidden rounded-xl border border-border-default bg-bg-surface"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border-default bg-bg-secondary/50 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-text-primary">
                                {group.className}
                              </p>
                              <p className="mt-0.5 text-xs text-text-muted">
                                {group.sessions.length} buổi
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                                Tổng cọc
                              </p>
                              <p className="text-sm font-semibold tabular-nums text-warning">
                                {formatCurrency(group.total)}
                              </p>
                            </div>
                          </div>

                          <div className="divide-y divide-border-subtle">
                            {group.sessions.map((session) => (
                              <div
                                key={session.id}
                                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-text-primary">
                                    {formatDate(session.date)}
                                  </p>
                                  <p className="mt-0.5 text-xs text-text-muted">
                                    Trạng thái:{" "}
                                    <span className="font-medium">
                                      {String(
                                        session.teacherPaymentStatus ??
                                          "deposit",
                                      )}
                                    </span>
                                  </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">
                                  {formatCurrency(
                                    session.teacherAllowanceTotal,
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end border-t border-border-default pt-4">
                  <button
                    type="button"
                    onClick={() => setDepositPopupOpen(false)}
                    className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
