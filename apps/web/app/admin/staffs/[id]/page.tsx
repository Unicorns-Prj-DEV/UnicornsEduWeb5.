"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { StaffDetail, StaffStatus } from "@/dtos/staff.dto";
import { formatCurrency } from "@/lib/class.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";
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

const DEFAULT_BONUS_FORM: BonusFormState = {
  workTypeOption: DEFAULT_ROLE_WORK_TYPE,
  amount: "",
  status: "pending",
  note: "",
};

function normalizeMoneyAmount(value?: number | string | null): number {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export default function AdminStaffDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrPopupOpen, setQrPopupOpen] = useState(false);
  const [addBonusPopupOpen, setAddBonusPopupOpen] = useState(false);
  const [bonusFormMode, setBonusFormMode] = useState<"create" | "edit">("create");
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);
  const [bonusForm, setBonusForm] = useState<BonusFormState>(DEFAULT_BONUS_FORM);
  const [workTypeMenuOpen, setWorkTypeMenuOpen] = useState(false);
  const [workTypeSearch, setWorkTypeSearch] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const workTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

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
    queryClient.invalidateQueries({
      queryKey: ["sessions", "staff", "year", id, selectedYear],
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
    return (detail.teachers ?? []).map((t) => ({ id: t.id, fullName: t.fullName }));
  }, []);

  const getClassStudents = useCallback(async (classId: string) => {
    const detail = await classApi.getClassById(classId);
    return (detail.students ?? []).map((s) => ({
      id: s.id,
      fullName: s.fullName,
      tuitionFee:
        typeof s.customTuitionPerSession === "number" && Number.isFinite(s.customTuitionPerSession)
          ? s.customTuitionPerSession
          : null,
    }));
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
  });

  const bonusRecords = useMemo<BonusRecord[]>(() => {
    const list = bonusListResponse?.data ?? [];
    return list.map((item) => {
      const amountRaw =
        typeof item.amount === "number" ? item.amount : Number(item.amount ?? 0);
      const safeAmount = Number.isFinite(amountRaw) ? amountRaw : 0;
      const rawStatus = (item.status ?? "").toString().toLowerCase();
      const mappedStatus = rawStatus === "paid" ? "paid" : "pending";
      return {
        id: item.id,
        workType: item.workType?.trim() || "Khác",
        amount: safeAmount,
        status: mappedStatus,
        note: item.note?.trim() || "",
      };
    });
  }, [bonusListResponse]);

  const bonuses = useMemo<
    { id: string; workType: string; status: "paid" | "unpaid" | "deposit"; amount: number }[]
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

  const bonusTotals = useMemo(
    () => ({
      total: bonuses.reduce((sum, b) => sum + b.amount, 0),
      paid: bonuses
        .filter((b) => b.status === "paid")
        .reduce((sum, b) => sum + b.amount, 0),
      unpaid: bonuses
        .filter((b) => b.status === "unpaid")
        .reduce((sum, b) => sum + b.amount, 0),
    }),
    [bonuses],
  );

  const workTypeOptions = useMemo(() => {
    return STAFF_ROLE_WORK_TYPE_OPTIONS;
  }, []);

  const filteredWorkTypeOptions = useMemo(() => {
    const needle = workTypeSearch.trim().toLowerCase();
    if (!needle) return workTypeOptions;
    return workTypeOptions.filter((item) => item.toLowerCase().includes(needle));
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
  const classes = useMemo(
    () =>
      staff?.classTeachers
        ?.map((ct: { class: { id: string; name: string } }) => ({
          id: ct.class.id,
          name: ct.class.name,
        }))
        .filter((item) => item.id && item.name) || [],
    [staff?.classTeachers],
  );

  const classMonthlySummaries = useMemo(() => {
    const classesById = new Map<
      string,
      { id: string; name: string; paid: number; unpaid: number }
    >();

    classes.forEach((item) => {
      classesById.set(item.id, {
        id: item.id,
        name: item.name,
        paid: 0,
        unpaid: 0,
      });
    });

    sessionsInCurrentMonth.forEach((session) => {
      const classId = session.classId?.trim() || session.class?.id?.trim();
      if (!classId) return;

      const existing = classesById.get(classId);
      const className =
        existing?.name || session.class?.name?.trim() || "Lớp chưa đặt tên";
      const summary = existing ?? {
        id: classId,
        name: className,
        paid: 0,
        unpaid: 0,
      };
      const amount = normalizeMoneyAmount(session.allowanceAmount);
      const isPaid = (session.teacherPaymentStatus ?? "").toLowerCase() === "paid";

      classesById.set(classId, {
        ...summary,
        name: summary.name || className,
        paid: summary.paid + (isPaid ? amount : 0),
        unpaid: summary.unpaid + (isPaid ? 0 : amount),
      });
    });

    return Array.from(classesById.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "vi"),
    );
  }, [classes, sessionsInCurrentMonth]);

  const sessionMonthlyTotals = useMemo(() => {
    return sessionsInCurrentMonth.reduce(
      (acc, session) => {
        const isPaid = (session.teacherPaymentStatus ?? "").toLowerCase() === "paid";
        const amount = normalizeMoneyAmount(session.allowanceAmount);

        return {
          total: acc.total + amount,
          paid: acc.paid + (isPaid ? amount : 0),
          unpaid: acc.unpaid + (isPaid ? 0 : amount),
        };
      },
      { total: 0, paid: 0, unpaid: 0 },
    );
  }, [sessionsInCurrentMonth]);

  const sessionYearTotal = useMemo(() => {
    return sessionsInCurrentYear.reduce((total, session) => {
      return total + normalizeMoneyAmount(session.allowanceAmount);
    }, 0);
  }, [sessionsInCurrentYear]);

  const deleteBonusMutation = useMutation({
    mutationFn: (bonusId: string) => bonusApi.deleteBonusById(bonusId),
    onSuccess: async () => {
      toast.success("Đã xóa thưởng.");
      await queryClient.invalidateQueries({
        queryKey: ["bonus", "list", "staff", id, selectedMonth],
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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
        queryKey: ["staff", "detail", id],
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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
        queryKey: ["staff", "detail", id],
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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
      workTypeOption: isExistingOption ? target.workType : DEFAULT_ROLE_WORK_TYPE,
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
      if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
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
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6" aria-busy="true" aria-live="polite">
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
          <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Quay lại danh sách nhân sự</span>
        </button>
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
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
        <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
              className={`absolute bottom-0 right-0 block size-3 rounded-full border-2 border-bg-surface ${staff.status === "active" ? "bg-warning" : "bg-text-muted"}`}
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
        onSuccess={handleStaffEditSuccess}
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
            className="mb-4 text-sm font-semibold uppercase tracking-wide text-black"
          >
            Thống kê thu nhập
          </h2>
          <div className="space-y-3 md:hidden">
            <div className="flex justify-between rounded-lg border border-black/10 bg-white px-4 py-3">
              <span className="text-sm text-black">Tổng tháng</span>
              <span className="tabular-nums text-sm font-semibold text-primary">{formatCurrency(sessionMonthlyTotals.total)}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-black/10 bg-white px-4 py-3">
              <span className="text-sm text-black">Chưa nhận</span>
              <span className="tabular-nums text-sm font-semibold text-error">{formatCurrency(sessionMonthlyTotals.unpaid)}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-black/10 bg-white px-4 py-3">
              <span className="text-sm text-black">Đã nhận</span>
              <span className="tabular-nums text-sm font-semibold text-success">{formatCurrency(sessionMonthlyTotals.paid)}</span>
            </div>
            <div className="flex justify-between rounded-lg border border-black/10 bg-white px-4 py-3">
              <span className="text-sm text-black">Tổng năm</span>
              <span className="tabular-nums text-sm font-semibold text-warning">{formatCurrency(sessionYearTotal)}</span>
            </div>
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[400px] border-collapse text-left text-sm">
              <caption className="sr-only">Bảng thống kê thu nhập nhân sự</caption>
              <thead className="bg-white">
                <tr className="border-b border-border-default bg-white">
                  <th scope="col" className="px-4 py-3 font-medium tabular-nums text-black">
                    Tổng tháng
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium tabular-nums text-black">
                    Chưa nhận
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium tabular-nums text-black">
                    Đã nhận
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium tabular-nums text-black">
                    Tổng năm
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary">
                  <td className="bg-white px-4 py-3 tabular-nums font-semibold text-primary">{formatCurrency(sessionMonthlyTotals.total)}</td>
                  <td className="bg-white px-4 py-3 tabular-nums font-semibold text-error">{formatCurrency(sessionMonthlyTotals.unpaid)}</td>
                  <td className="bg-white px-4 py-3 tabular-nums font-semibold text-success">{formatCurrency(sessionMonthlyTotals.paid)}</td>
                  <td className="bg-white px-4 py-3 tabular-nums font-semibold text-warning">{formatCurrency(sessionYearTotal)}</td>
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
            {classMonthlySummaries.length === 0 ? (
              <p className="text-text-muted">Chưa gán lớp nào.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-text-muted">
                  Số liệu phụ cấp theo {selectedMonthLabel}.
                </p>
                <div className="space-y-3 md:hidden">
                  {classMonthlySummaries.map((item) => {
                    const total = item.paid + item.unpaid;
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3"
                      >
                        <p className="font-medium text-text-primary">{item.name}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                          <span>
                            Tổng: <span className="font-semibold text-primary">{formatCurrency(total)}</span>
                          </span>
                          <span>
                            Chưa nhận: <span className="font-semibold text-error">{formatCurrency(item.unpaid)}</span>
                          </span>
                          <span>
                            Đã nhận: <span className="font-semibold text-success">{formatCurrency(item.paid)}</span>
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
                      {classMonthlySummaries.map((item) => {
                        const total = item.paid + item.unpaid;

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                          >
                            <td className="px-4 py-3 text-text-primary">{item.name}</td>
                            <td className="px-4 py-3 tabular-nums font-semibold text-primary">
                              {formatCurrency(total)}
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
            <p className="mt-2 text-sm text-text-muted" aria-live="polite">
              Đang tải dữ liệu thưởng...
            </p>
          ) : null}
          {isBonusError ? (
            <p className="mt-2 text-sm text-error" role="alert">
              Không tải được dữ liệu thưởng.
            </p>
          ) : null}
        </div>

        <StaffCard title="Công việc khác">
          {(() => {
            const otherRoles = (staff.roles ?? []).filter((r) => r !== "teacher");
            if (otherRoles.length === 0) {
              return <p className="text-text-muted">Chưa có công việc khác (role ngoài giáo viên).</p>;
            }
            return (
              <>
                <div className="space-y-3 md:hidden">
                  {otherRoles.map((role) => (
                    <div
                      key={role}
                      className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3"
                    >
                      <p className="font-medium text-text-primary">{ROLE_LABELS[role] ?? role}</p>
                      <p className="mt-1 text-sm text-text-muted">Tổng nhận / Chưa nhận / Đã nhận: 0 (đang phát triển)</p>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
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
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-border-default bg-bg-surface text-text-primary transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:size-8"
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
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-border-default bg-bg-surface text-text-primary transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:size-8"
              aria-label="Tháng sau"
              title="Tháng sau"
            >
              ▶
            </button>
          </div>

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
          <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={closeAddBonusPopup} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-bonus-title"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-bg-surface p-4 shadow-xl sm:p-5"
          >
            <h2 id="add-bonus-title" className="text-lg font-semibold text-text-primary">
              {bonusFormMode === "create" ? "Thêm thưởng" : "Chỉnh sửa thưởng"}
            </h2>
            <p className="mt-1 text-sm text-text-muted">Áp dụng cho {selectedMonthLabel}</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">Loại công việc</span>
                <div className="relative" ref={workTypeMenuRef}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2 text-left text-sm text-text-primary transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    onClick={() => setWorkTypeMenuOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={workTypeMenuOpen}
                    aria-label="Chọn loại công việc"
                  >
                    <span className="truncate">
                      {bonusForm.workTypeOption}
                    </span>
                    <svg
                      className={`ml-2 size-4 shrink-0 text-text-muted transition-transform duration-200 ${workTypeMenuOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
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
                          <p className="px-2 py-2 text-sm text-text-muted">Không tìm thấy công việc phù hợp.</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">Số tiền</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={bonusForm.amount}
                  onChange={(e) => setBonusForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="Ví dụ: 500000"
                  className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-text-secondary">Trạng thái</span>
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
                      <span className={`size-2 rounded-full ${bonusForm.status === "paid" ? "bg-success" : "bg-warning"}`} aria-hidden />
                      {bonusForm.status === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                    </span>
                    <svg
                      className={`ml-2 size-4 shrink-0 text-text-muted transition-transform duration-200 ${statusMenuOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {statusMenuOpen ? (
                    <div
                      role="listbox"
                      aria-label="Danh sách trạng thái thanh toán"
                      className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border-default bg-bg-surface p-1 shadow-lg"
                    >
                      {[
                        { value: "pending" as const, label: "Chờ thanh toán", dot: "bg-warning" },
                        { value: "paid" as const, label: "Đã thanh toán", dot: "bg-success" },
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
                              setBonusForm((prev) => ({ ...prev, status: option.value }));
                              setStatusMenuOpen(false);
                            }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className={`size-2 rounded-full ${option.dot}`} aria-hidden />
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
                <span className="mb-1 block text-sm font-medium text-text-secondary">Ghi chú</span>
                <textarea
                  rows={3}
                  value={bonusForm.note}
                  onChange={(e) => setBonusForm((prev) => ({ ...prev, note: e.target.value }))}
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
                disabled={createBonusMutation.isPending || updateBonusMutation.isPending}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitBonus}
                className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:py-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createBonusMutation.isPending || updateBonusMutation.isPending}
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
    </div>
  );
}
