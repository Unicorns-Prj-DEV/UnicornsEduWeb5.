"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ClockIcon,
  QrCodeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { toast } from "sonner";
import type {
  CustomerCareCommissionItem,
  CustomerCarePaymentStatus,
  CustomerCareSessionCommissionItem,
  CustomerCareStudentItem,
  CustomerCareTopUpHistoryItem,
} from "@/dtos/customer-care.dto";
import type { StudentStatus, StudentWalletTransaction } from "@/dtos/student.dto";
import {
  buildAdminLikePath,
  resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";
import * as customerCareApi from "@/lib/apis/customer-care.api";
import { getFullProfile } from "@/lib/apis/auth.api";
import * as studentApi from "@/lib/apis/student.api";
import { formatCurrency } from "@/lib/class.helpers";
import { copyStudentWalletQrWithToast } from "@/lib/clipboard-qr";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import SelectionCheckbox from "@/components/ui/SelectionCheckbox";
import UpgradedSelect from "@/components/ui/UpgradedSelect";

const SESSION_DAYS = 30;
const STUDENT_PAGE_SIZE = 10;
const PAYMENT_HISTORY_LIMIT = 20;
const TOP_UP_HISTORY_PAGE_SIZE = 20;

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Đang học",
  inactive: "Ngừng theo dõi",
};

const PAYMENT_STATUS_LABELS: Record<CustomerCarePaymentStatus, string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
};

type TabId = "students" | "payments" | "commissions";

const COMMISSION_ROW_GRID_CLASS =
  "grid-cols-[minmax(0,1fr)_auto_1.25rem] md:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_1.5rem]";
const SESSION_COMMISSION_GRID_CLASS =
  "grid-cols-[7.5rem_minmax(14rem,1.85fr)_8.5rem_6.5rem_10rem_8.5rem]";
const SESSION_COMMISSION_GRID_WITH_SELECTION_CLASS =
  "grid-cols-[2.75rem_7.5rem_minmax(14rem,1.85fr)_8.5rem_6.5rem_10rem_8.5rem]";
const DEFAULT_BULK_PAYMENT_STATUS: CustomerCarePaymentStatus = "paid";
const BULK_PAYMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
] as const;
const TAB_INDICATOR_TRANSITION: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};
const TAB_PANEL_TRANSITION: Transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

function CustomerCareCardSkeleton({
  rows = 3,
  variant = "student",
}: {
  rows?: number;
  variant?: "student" | "payment" | "commission";
}) {
  return (
    <div className="space-y-3 lg:hidden" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <article
          key={`${variant}-mobile-skeleton-${index}`}
          className="rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-2.5 rounded-full bg-bg-tertiary" />
                <Skeleton className="h-4 w-36 rounded bg-bg-tertiary" />
              </div>
              <Skeleton className="h-3 w-48 rounded bg-bg-tertiary" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full bg-bg-tertiary" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-4 w-full rounded bg-bg-tertiary" />
            <Skeleton className="h-4 w-4/5 rounded bg-bg-tertiary" />
            <Skeleton className="h-4 w-5/6 rounded bg-bg-tertiary" />
            <Skeleton className="h-4 w-3/4 rounded bg-bg-tertiary" />
          </div>
        </article>
      ))}
    </div>
  );
}

function CustomerCareTableSkeleton({
  columns,
  rows = 5,
  minWidthClass = "min-w-[760px]",
}: {
  columns: string[];
  rows?: number;
  minWidthClass?: string;
}) {
  return (
    <div
      className="hidden overflow-x-auto rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm lg:block"
      aria-hidden
    >
      <table className={cn("w-full border-collapse text-left text-sm", minWidthClass)}>
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary/80">
            {columns.map((width, index) => (
              <th key={`customer-care-table-skeleton-head-${index}`} className="px-3 py-3">
                <Skeleton className={cn("h-3 rounded bg-bg-tertiary", width)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`customer-care-table-skeleton-row-${rowIndex}`}>
              {columns.map((width, columnIndex) => (
                <td
                  key={`customer-care-table-skeleton-cell-${rowIndex}-${columnIndex}`}
                  className="px-3 py-3"
                >
                  <Skeleton className={cn("h-4 rounded bg-bg-tertiary", width)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerCareListSkeleton({
  variant,
  columns,
  rows = 5,
  minWidthClass,
}: {
  variant: "student" | "payment" | "commission";
  columns: string[];
  rows?: number;
  minWidthClass?: string;
}) {
  return (
    <div className="space-y-3">
      <CustomerCareCardSkeleton rows={Math.min(rows, 3)} variant={variant} />
      <CustomerCareTableSkeleton columns={columns} rows={rows} minWidthClass={minWidthClass} />
    </div>
  );
}

function PaymentHistorySkeleton() {
  return (
    <ul className="divide-y divide-border-subtle" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <li
          key={`payment-history-skeleton-${index}`}
          className="grid gap-2 py-3 text-sm sm:grid-cols-[9rem_8rem_8.5rem_minmax(0,1fr)] sm:items-start"
        >
          <Skeleton className="h-4 w-28 rounded bg-bg-tertiary" />
          <Skeleton className="h-4 w-20 rounded bg-bg-tertiary" />
          <Skeleton className="h-5 w-24 rounded-full bg-bg-tertiary" />
          <Skeleton className="h-4 w-full rounded bg-bg-tertiary" />
        </li>
      ))}
    </ul>
  );
}

function SessionCommissionSkeleton() {
  return (
    <div className="overflow-x-auto" aria-hidden>
      <div className="min-w-[720px] space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`session-commission-skeleton-${index}`}
            className={`grid items-center gap-3 rounded-xl bg-bg-surface px-3 py-2 ${SESSION_COMMISSION_GRID_CLASS}`}
          >
            <Skeleton className="h-4 w-20 rounded bg-bg-tertiary" />
            <Skeleton className="h-4 w-full rounded bg-bg-tertiary" />
            <Skeleton className="h-4 w-24 rounded bg-bg-tertiary" />
            <Skeleton className="h-5 w-16 rounded-full bg-bg-tertiary" />
            <Skeleton className="h-4 w-24 rounded bg-bg-tertiary" />
            <Skeleton className="h-5 w-20 rounded-full bg-bg-tertiary" />
          </div>
        ))}
      </div>
    </div>
  );
}

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

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function statusDotClass(status: StudentStatus | null): string {
  return status === "active" ? "bg-success" : "bg-error";
}

function paymentStatusChipClass(status: CustomerCarePaymentStatus): string {
  return status === "paid"
    ? "border-success/25 bg-success/10 text-success"
    : "border-warning/25 bg-warning/10 text-warning";
}

function recentTopUpTextClass(meetsThreshold: boolean): string {
  return meetsThreshold ? "text-success" : "text-error";
}

function walletTransactionAmountClass(type: StudentWalletTransaction["type"]): string {
  return type === "topup" ? "text-success" : "text-error";
}

function formatWalletTransactionAmount(tx: StudentWalletTransaction): string {
  return `${tx.type === "topup" ? "+" : "-"}${formatCurrency(tx.amount)}`;
}

const WALLET_TRANSACTION_TYPE_LABELS: Record<
  StudentWalletTransaction["type"],
  string
> = {
  topup: "Nạp tiền",
  loan: "Điều chỉnh giảm",
  repayment: "Trừ học phí",
  extend: "Gia hạn khóa",
};

export default function CustomerCareDetailPanels({
  staffId,
  workspaceMode = "self",
  allowStaffClassNavigation = false,
}: {
  staffId: string;
  workspaceMode?: "admin" | "self";
  allowStaffClassNavigation?: boolean;
}) {
  const pathname = usePathname();
  const routeBase = resolveAdminLikeRouteBase(pathname);
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("students");
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [paymentHistoryStudent, setPaymentHistoryStudent] =
    useState<CustomerCareStudentItem | null>(null);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkPaymentPopupOpen, setBulkPaymentPopupOpen] = useState(false);
  const [bulkPaymentStatusDraft, setBulkPaymentStatusDraft] =
    useState<CustomerCarePaymentStatus>(DEFAULT_BULK_PAYMENT_STATUS);
  const studentLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const topUpLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const isAdminWorkspace = workspaceMode === "admin";

  const { data: fullProfile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const staffRoles = fullProfile?.staffInfo?.roles ?? [];
  const canEditCommissionPaymentStatus =
    fullProfile?.roleType === "admin" ||
    staffRoles.includes("assistant") ||
    staffRoles.includes("accountant_income") ||
    staffRoles.includes("accountant_expense") ||
    staffRoles.includes("accountant") ||
    staffRoles.includes("admin");

  const {
    data: studentListPages,
    isLoading: studentsLoading,
    isFetching: studentsFetching,
    isFetchingNextPage: studentsFetchingNextPage,
    isError: studentsError,
    fetchNextPage: fetchNextStudentPage,
    hasNextPage: hasNextStudentPage,
  } = useInfiniteQuery({
    queryKey: ["customer-care", "students", staffId, STUDENT_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      customerCareApi.getCustomerCareStudents(staffId, {
        page: pageParam,
        limit: STUDENT_PAGE_SIZE,
      }),
    enabled: !!staffId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loadedCount = lastPage.meta.page * lastPage.meta.limit;
      return loadedCount < lastPage.meta.total ? lastPage.meta.page + 1 : undefined;
    },
  });

  const studentPages = studentListPages?.pages ?? [];
  const students = studentPages.flatMap((page) => page.data);
  const studentsRefreshing =
    studentsFetching && !studentsLoading && !studentsFetchingNextPage;

  const {
    data: topUpHistoryPages,
    isLoading: topUpHistoryLoading,
    isFetching: topUpHistoryFetching,
    isFetchingNextPage: topUpHistoryFetchingNextPage,
    isError: topUpHistoryError,
    fetchNextPage: fetchNextTopUpHistoryPage,
    hasNextPage: hasNextTopUpHistoryPage,
  } = useInfiniteQuery({
    queryKey: [
      "customer-care",
      "topup-history",
      staffId,
      TOP_UP_HISTORY_PAGE_SIZE,
    ],
    queryFn: ({ pageParam }) =>
      customerCareApi.getCustomerCareTopUpHistory(staffId, {
        page: pageParam,
        limit: TOP_UP_HISTORY_PAGE_SIZE,
      }),
    enabled: !!staffId && activeTab === "payments",
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loadedCount = lastPage.meta.page * lastPage.meta.limit;
      return loadedCount < lastPage.meta.total ? lastPage.meta.page + 1 : undefined;
    },
  });

  const topUpHistoryPageList = topUpHistoryPages?.pages ?? [];
  const topUpHistory = topUpHistoryPageList.flatMap((page) => page.data);
  const topUpHistoryRefreshing =
    topUpHistoryFetching &&
    !topUpHistoryLoading &&
    !topUpHistoryFetchingNextPage;

  const {
    data: paymentHistory = [],
    isLoading: paymentHistoryLoading,
    isError: paymentHistoryError,
  } = useQuery({
    queryKey: [
      "customer-care",
      "student-payment-history",
      paymentHistoryStudent?.id,
      PAYMENT_HISTORY_LIMIT,
    ],
    queryFn: () =>
      studentApi.getStudentWalletHistory(paymentHistoryStudent!.id, {
        limit: PAYMENT_HISTORY_LIMIT,
        type: "topup",
      }),
    enabled: !!paymentHistoryStudent,
    staleTime: 30_000,
  });

  const {
    data: commissions = [],
    isLoading: commissionsLoading,
    isError: commissionsError,
  } = useQuery({
    queryKey: ["customer-care", "commissions", staffId, SESSION_DAYS],
    queryFn: () => customerCareApi.getCustomerCareCommissions(staffId, SESSION_DAYS),
    enabled: !!staffId && activeTab === "commissions",
  });

  const expandedStudentIdList = useMemo(
    () => Array.from(expandedStudentIds).sort(),
    [expandedStudentIds],
  );

  const sessionCommissionQueries = useQueries({
    queries: expandedStudentIdList.map((studentId) => ({
      queryKey: [
        "customer-care",
        "session-commissions",
        staffId,
        studentId,
        SESSION_DAYS,
      ],
      queryFn: () =>
        customerCareApi.getCustomerCareSessionCommissions(
          staffId,
          studentId,
          SESSION_DAYS,
        ),
      enabled: !!staffId && activeTab === "commissions",
      staleTime: 30_000,
    })),
  });

  const sessionCommissionsByStudentId = useMemo(() => {
    const map = new Map<string, CustomerCareSessionCommissionItem[]>();
    expandedStudentIdList.forEach((studentId, index) => {
      map.set(studentId, sessionCommissionQueries[index]?.data ?? []);
    });
    return map;
  }, [expandedStudentIdList, sessionCommissionQueries]);

  const sessionCommissionsLoadingByStudentId = useMemo(() => {
    const map = new Map<string, boolean>();
    expandedStudentIdList.forEach((studentId, index) => {
      map.set(studentId, sessionCommissionQueries[index]?.isLoading ?? false);
    });
    return map;
  }, [expandedStudentIdList, sessionCommissionQueries]);

  const expandedAttendanceIds = useMemo(() => {
    const ids: string[] = [];
    sessionCommissionQueries.forEach((query) => {
      (query.data ?? []).forEach((session) => {
        if (session.attendanceId) {
          ids.push(session.attendanceId);
        }
      });
    });
    return ids;
  }, [sessionCommissionQueries]);

  const visibleSelectedAttendanceIds = useMemo(
    () =>
      new Set(
        expandedAttendanceIds.filter((attendanceId) =>
          selectedAttendanceIds.has(attendanceId),
        ),
      ),
    [expandedAttendanceIds, selectedAttendanceIds],
  );

  const selectedCount = selectedAttendanceIds.size;
  const allExpandedSessionsSelected =
    expandedAttendanceIds.length > 0 &&
    visibleSelectedAttendanceIds.size === expandedAttendanceIds.length;
  const someExpandedSessionsSelected =
    visibleSelectedAttendanceIds.size > 0 && !allExpandedSessionsSelected;

  const bulkPaymentStatusMutation = useMutation({
    mutationFn: (payload: {
      attendanceIds: string[];
      paymentStatus: CustomerCarePaymentStatus;
    }) =>
      customerCareApi.bulkUpdateCustomerCarePaymentStatus(staffId, payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: ["customer-care", "commissions", staffId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["customer-care", "session-commissions", staffId],
      });
      setSelectedAttendanceIds(new Set());
      setBulkPaymentPopupOpen(false);
      toast.success(
        result.updatedCount > 0
          ? `Đã cập nhật ${result.updatedCount} khoản hoa hồng.`
          : "Các khoản đã chọn đang ở trạng thái này.",
      );
    },
    onError: () => {
      toast.error("Không thể cập nhật trạng thái thanh toán. Vui lòng thử lại.");
    },
  });

  useEffect(() => {
    if (
      activeTab !== "students" ||
      !hasNextStudentPage ||
      studentsLoading ||
      studentsFetchingNextPage
    ) {
      return;
    }

    const target = studentLoadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextStudentPage();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    activeTab,
    fetchNextStudentPage,
    hasNextStudentPage,
    studentsFetchingNextPage,
    studentsLoading,
  ]);

  useEffect(() => {
    if (
      activeTab !== "payments" ||
      !hasNextTopUpHistoryPage ||
      topUpHistoryLoading ||
      topUpHistoryFetchingNextPage
    ) {
      return;
    }

    const target = topUpLoadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextTopUpHistoryPage();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    activeTab,
    fetchNextTopUpHistoryPage,
    hasNextTopUpHistoryPage,
    topUpHistoryFetchingNextPage,
    topUpHistoryLoading,
  ]);

  if (!staffId) {
    return (
      <div className="rounded-[1.5rem] border border-border-default bg-bg-surface px-4 py-6 text-sm text-text-muted shadow-sm">
        Không tìm thấy hồ sơ nhân sự CSKH.
      </div>
    );
  }

  const toggleExpand = (studentId: string) => {
    setExpandedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const getStudentAttendanceIds = (studentId: string) =>
    (sessionCommissionsByStudentId.get(studentId) ?? [])
      .map((session) => session.attendanceId)
      .filter((attendanceId): attendanceId is string => !!attendanceId);

  const isAllStudentSessionsSelected = (studentId: string) => {
    const attendanceIds = getStudentAttendanceIds(studentId);
    return (
      attendanceIds.length > 0 &&
      attendanceIds.every((attendanceId) =>
        selectedAttendanceIds.has(attendanceId),
      )
    );
  };

  const isSomeStudentSessionsSelected = (studentId: string) => {
    const attendanceIds = getStudentAttendanceIds(studentId);
    const selectedInStudent = attendanceIds.filter((attendanceId) =>
      selectedAttendanceIds.has(attendanceId),
    ).length;
    return selectedInStudent > 0 && selectedInStudent < attendanceIds.length;
  };

  const toggleAllStudentSessions = (studentId: string) => {
    const attendanceIds = getStudentAttendanceIds(studentId);
    const allSelected = isAllStudentSessionsSelected(studentId);
    setSelectedAttendanceIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        attendanceIds.forEach((attendanceId) => next.delete(attendanceId));
      } else {
        attendanceIds.forEach((attendanceId) => next.add(attendanceId));
      }
      return next;
    });
  };

  const toggleAttendanceSelection = (attendanceId: string) => {
    setSelectedAttendanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(attendanceId)) {
        next.delete(attendanceId);
      } else {
        next.add(attendanceId);
      }
      return next;
    });
  };

  const toggleAllExpandedSessions = () => {
    setSelectedAttendanceIds((prev) => {
      const next = new Set(prev);
      if (allExpandedSessionsSelected) {
        expandedAttendanceIds.forEach((attendanceId) => next.delete(attendanceId));
      } else {
        expandedAttendanceIds.forEach((attendanceId) => next.add(attendanceId));
      }
      return next;
    });
  };

  const openBulkPaymentPopup = () => {
    setBulkPaymentStatusDraft(DEFAULT_BULK_PAYMENT_STATUS);
    setBulkPaymentPopupOpen(true);
  };

  const closeBulkPaymentPopup = () => {
    if (bulkPaymentStatusMutation.isPending) return;
    setBulkPaymentPopupOpen(false);
  };

  const confirmBulkPaymentStatusUpdate = () => {
    if (selectedCount === 0 || bulkPaymentStatusMutation.isPending) return;
    bulkPaymentStatusMutation.mutate({
      attendanceIds: Array.from(selectedAttendanceIds),
      paymentStatus: bulkPaymentStatusDraft,
    });
  };

  const openPaymentHistory = (student: CustomerCareStudentItem) => {
    setPaymentHistoryStudent(student);
  };

  const closePaymentHistory = () => {
    setPaymentHistoryStudent(null);
  };

  const handleCopyQr = async (student: CustomerCareStudentItem) => {
    try {
      const qr = await studentApi.getStudentSePayStaticQr(student.id);
      await copyStudentWalletQrWithToast(qr.qrCodeUrl, {
        id: student.id,
        fullName: student.fullName,
        studentClasses: student.classes?.map((c) => ({
          class: {
            id: c.id,
            name: c.name,
          },
          status: "active",
        })),
      });
    } catch {
      toast.error("Không thể sao chép QR. Vui lòng thử lại.");
    }
  };

  const buildStudentHref = (student: CustomerCareStudentItem) => {
    if (isAdminWorkspace) {
      return `${buildAdminLikePath(routeBase, "students")}?search=${encodeURIComponent(
        student.fullName || "",
      )}`;
    }

    return `/staff/students/${encodeURIComponent(student.id)}`;
  };

  const buildTopUpStudentHref = (item: CustomerCareTopUpHistoryItem) => {
    if (isAdminWorkspace) {
      return `${buildAdminLikePath(routeBase, "students")}?search=${encodeURIComponent(
        item.studentName || "",
      )}`;
    }

    return `/staff/students/${encodeURIComponent(item.studentId)}`;
  };

  const buildClassHref = (classId: string) => {
    if (isAdminWorkspace) {
      return buildAdminLikePath(
        routeBase,
        `classes/${encodeURIComponent(classId)}`,
      );
    }

    if (!allowStaffClassNavigation) {
      return null;
    }

    return `/staff/classes/${encodeURIComponent(classId)}`;
  };

  const renderClassLinks = (
    classes: CustomerCareStudentItem["classes"] | undefined,
  ) => {
    if (!classes?.length) {
      return <span className="text-sm text-text-muted">-</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {classes.map((classItem) => {
          const href = buildClassHref(classItem.id);

          if (!href) {
            return (
              <span
                key={classItem.id}
                className="inline-flex rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary"
              >
                {classItem.name}
              </span>
            );
          }

          return (
            <Link
              key={classItem.id}
              href={href}
              className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary/35 hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {classItem.name}
            </Link>
          );
        })}
      </div>
    );
  };

  const indicatorTransition = prefersReducedMotion
    ? { duration: 0 }
    : TAB_INDICATOR_TRANSITION;
  const activeTabIndex =
    activeTab === "students" ? 0 : activeTab === "payments" ? 1 : 2;
  const panelMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: TAB_PANEL_TRANSITION,
      };

  const renderPaymentHistoryModal = () => (
    <AnimatePresence>
      {paymentHistoryStudent ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg-primary/75 px-3 py-4 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-history-title"
          {...panelMotionProps}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Đóng lịch sử tiền vào"
            onClick={closePaymentHistory}
          />
          <div className="relative z-10 flex max-h-[min(88vh,42rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.25rem] border border-border-default bg-bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-text-muted">
                  <ClockIcon className="size-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                    {PAYMENT_HISTORY_LIMIT} khoản nạp gần nhất
                  </p>
                </div>
                <h3
                  id="payment-history-title"
                  className="mt-2 text-lg font-semibold text-text-primary"
                >
                  Lịch sử tiền vào
                </h3>
                <p className="mt-1 truncate text-sm text-text-secondary">
                  {paymentHistoryStudent.fullName || "Học sinh"} · Số dư{" "}
                  {formatCurrency(paymentHistoryStudent.accountBalance)}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentHistory}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Đóng"
              >
                <XMarkIcon className="size-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
              {paymentHistoryLoading ? (
                <PaymentHistorySkeleton />
              ) : paymentHistoryError ? (
                <p className="text-sm text-error">
                  Không tải được lịch sử tiền vào.
                </p>
              ) : paymentHistory.length === 0 ? (
                <p className="text-sm text-text-muted">
                  Chưa có khoản nạp tiền.
                </p>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {paymentHistory.map((tx: StudentWalletTransaction) => (
                    <li
                      key={tx.id}
                      className="grid gap-2 py-3 text-sm sm:grid-cols-[9rem_8rem_8.5rem_minmax(0,1fr)] sm:items-start"
                    >
                      <span className="font-medium text-text-primary">
                        {formatDateTime(tx.createdAt ?? tx.date)}
                      </span>
                      <span className="text-text-muted">
                        {WALLET_TRANSACTION_TYPE_LABELS[tx.type]}
                      </span>
                      <span
                        className={`tabular-nums font-semibold ${walletTransactionAmountClass(
                          tx.type,
                        )}`}
                      >
                        {formatWalletTransactionAmount(tx)}
                      </span>
                      <span className="min-w-0 break-words text-text-secondary">
                        {tx.note?.trim() || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="mb-4 inline-flex w-full rounded-[1.35rem] border border-border-default bg-gradient-to-b from-bg-surface to-bg-secondary/90 p-1 shadow-sm sm:w-fit"
        role="tablist"
        aria-label="Học sinh, Thanh Toán hoặc Hoa hồng"
      >
        <div className="relative grid w-full min-w-0 grid-cols-3 sm:min-w-[336px]">
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/3 rounded-[1rem] bg-primary shadow-sm ring-1 ring-primary/10"
            animate={{ x: `${activeTabIndex * 100}%` }}
            transition={indicatorTransition}
          />

          <button
            id="customer-care-tab-students"
            type="button"
            role="tab"
            aria-selected={activeTab === "students"}
            aria-controls="customer-care-panel-students"
            onClick={() => setActiveTab("students")}
            className={`relative z-10 min-h-11 cursor-pointer touch-manipulation rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition-[color,opacity] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${activeTab === "students"
              ? "text-text-inverse"
              : "text-text-muted hover:text-text-primary"
              }`}
          >
            Học sinh
          </button>
          <button
            id="customer-care-tab-payments"
            type="button"
            role="tab"
            aria-selected={activeTab === "payments"}
            aria-controls="customer-care-panel-payments"
            onClick={() => setActiveTab("payments")}
            className={`relative z-10 min-h-11 cursor-pointer touch-manipulation rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition-[color,opacity] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${activeTab === "payments"
              ? "text-text-inverse"
              : "text-text-muted hover:text-text-primary"
              }`}
          >
            Thanh Toán
          </button>
          <button
            id="customer-care-tab-commissions"
            type="button"
            role="tab"
            aria-selected={activeTab === "commissions"}
            aria-controls="customer-care-panel-commissions"
            onClick={() => setActiveTab("commissions")}
            className={`relative z-10 min-h-11 cursor-pointer touch-manipulation rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition-[color,opacity] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${activeTab === "commissions"
              ? "text-text-inverse"
              : "text-text-muted hover:text-text-primary"
              }`}
          >
            Hoa hồng
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "students" ? (
        <motion.section
          key="students"
          id="customer-care-panel-students"
          role="tabpanel"
          aria-labelledby="customer-care-tab-students"
          className="min-w-0 flex-1"
          aria-label="Danh sách học sinh chăm sóc"
          {...panelMotionProps}
        >
          <div className="mb-3 ml-5">
            <h2 className="text-base font-medium text-text-primary">Học sinh</h2>
          </div>

          {studentsError && (
            <p className="text-sm text-error" role="alert">
              Không tải được danh sách học sinh.
            </p>
          )}
          {studentsLoading && (
            <CustomerCareListSkeleton
              variant="student"
              columns={["w-16", "w-36", "w-20", "w-24", "w-20", "w-24", "w-16"]}
              rows={STUDENT_PAGE_SIZE}
              minWidthClass="min-w-[840px]"
            />
          )}
          {!studentsLoading && !studentsError && students.length === 0 && (
            <div className="rounded-[1.5rem] border border-border-default bg-bg-surface p-6 text-center text-sm text-text-muted shadow-sm">
              Chưa có học sinh được giao chăm sóc.
            </div>
          )}
          {!studentsLoading && !studentsError && students.length > 0 && (
            <div
              className={cn(
                "space-y-3 transition-opacity",
                studentsRefreshing && "opacity-70",
              )}
            >
              <div className="space-y-3 lg:hidden">
                {students.map((row: CustomerCareStudentItem) => (
                  <article
                    key={`mobile-${row.id}`}
                    className="rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block size-2.5 rounded-full ${statusDotClass(
                              row.status ?? "active",
                            )}`}
                            aria-hidden
                          />
                          <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                            {STATUS_LABELS[row.status ?? "active"]}
                          </span>
                        </div>
                        <Link
                          href={buildStudentHref(row)}
                          className="mt-3 inline-flex max-w-full text-base font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          <span className="truncate">{row.fullName || "—"}</span>
                        </Link>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleCopyQr(row)}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        aria-label={`Sao chép QR thanh toán của ${row.fullName || "học sinh"}`}
                        title="Sao chép QR thanh toán"
                      >
                        <QrCodeIcon className="size-5" aria-hidden />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[1.15rem] border border-border-default bg-bg-secondary/35 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Số dư
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
                          {formatCurrency(row.accountBalance)}
                        </p>
                      </div>
                      <div className="rounded-[1.15rem] border border-border-default bg-bg-secondary/35 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Tiền vào
                        </p>
                        <button
                          type="button"
                          onClick={() => openPaymentHistory(row)}
                          className={`mt-1 inline-flex min-h-9 max-w-full items-center rounded-md text-left text-lg font-semibold tabular-nums underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${recentTopUpTextClass(
                            row.recentTopUpMeetsThreshold,
                          )}`}
                          aria-label={`Xem lịch sử tiền vào của ${row.fullName || "học sinh"}`}
                        >
                          {formatCurrency(row.recentTopUpTotalLast21Days)}
                        </button>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Tỉnh
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {row.province ?? "—"}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Lớp
                        </p>
                        <div className="mt-2">{renderClassLinks(row.classes)}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm lg:block">
                <table className="w-full min-w-[940px] border-collapse text-left text-sm">
                <caption className="sr-only">Danh sách học sinh chăm sóc</caption>
                <thead>
                  <tr className="border-b border-border-default bg-bg-secondary/80">
                    <th scope="col" className="w-9 px-3 py-3 font-medium text-text-primary">
                      <span className="sr-only">Trạng thái</span>
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-text-primary">
                      Tên
                    </th>
                    <th scope="col" className="w-14 px-3 py-3 font-medium text-text-primary">
                      <span className="sr-only">QR</span>
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-text-primary tabular-nums">
                      Số dư
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-text-primary tabular-nums">
                      Tiền vào
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-text-primary">
                      Tỉnh
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-text-primary">
                      Lớp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((row: CustomerCareStudentItem) => (
                      <tr
                        key={`desktop-${row.id}`}
                        className="border-b border-border-subtle bg-bg-surface last:border-b-0"
                      >
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block size-2.5 rounded-full ${statusDotClass(row.status ?? "active")}`}
                            title={STATUS_LABELS[row.status ?? "active"]}
                            aria-hidden
                          />
                        </td>
                        <td className="px-3 py-3 font-medium text-text-primary">
                          <Link
                            href={buildStudentHref(row)}
                            className="text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            {row.fullName || "—"}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => void handleCopyQr(row)}
                            className="inline-flex size-10 items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            aria-label={`Sao chép QR thanh toán của ${row.fullName || "học sinh"}`}
                            title="Sao chép QR thanh toán"
                          >
                            <QrCodeIcon className="size-5" aria-hidden />
                          </button>
                        </td>
                        <td className="px-3 py-3 tabular-nums text-text-secondary">
                          {formatCurrency(row.accountBalance)}
                        </td>
                        <td
                          className={`px-3 py-3 tabular-nums font-semibold ${recentTopUpTextClass(
                            row.recentTopUpMeetsThreshold,
                          )}`}
                        >
                          <button
                            type="button"
                            onClick={() => openPaymentHistory(row)}
                            className="rounded-md text-left tabular-nums underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            aria-label={`Xem lịch sử tiền vào của ${row.fullName || "học sinh"}`}
                          >
                            {formatCurrency(row.recentTopUpTotalLast21Days)}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-text-secondary">{row.province ?? "—"}</td>
                        <td className="px-3 py-3 text-text-secondary">
                          {renderClassLinks(row.classes)}
                        </td>
                      </tr>
                  ))}
                </tbody>
                </table>
              </div>
              <div
                ref={studentLoadMoreRef}
                className="flex flex-col items-center gap-2 border-t border-border-default pt-4 text-center"
                aria-live="polite"
              >
                {studentsFetchingNextPage ? (
                  <p className="text-sm text-text-muted">Đang tải thêm học sinh…</p>
                ) : hasNextStudentPage ? (
                  <button
                    type="button"
                    onClick={() => void fetchNextStudentPage()}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tải thêm học sinh
                  </button>
                ) : (
                  <span className="sr-only">Đã tải hết học sinh</span>
                )}
              </div>
            </div>
          )}
        </motion.section>
      ) : activeTab === "payments" ? (
        <motion.section
          key="payments"
          id="customer-care-panel-payments"
          role="tabpanel"
          aria-labelledby="customer-care-tab-payments"
          className="min-w-0 flex-1"
          aria-label="Lịch sử tiền vào của học sinh CSKH"
          {...panelMotionProps}
        >
          <div className="mb-3 ml-5">
            <h2 className="text-base font-medium text-text-primary">Thanh Toán</h2>
          </div>

          {topUpHistoryError && (
            <p className="text-sm text-error" role="alert">
              Không tải được lịch sử tiền vào.
            </p>
          )}
          {topUpHistoryLoading && (
            <CustomerCareListSkeleton
              variant="payment"
              columns={["w-28", "w-36", "w-24", "w-64"]}
              rows={TOP_UP_HISTORY_PAGE_SIZE}
              minWidthClass="min-w-[760px]"
            />
          )}
          {!topUpHistoryLoading && !topUpHistoryError && topUpHistory.length === 0 && (
            <div className="rounded-[1.5rem] border border-border-default bg-bg-surface p-6 text-center text-sm text-text-muted shadow-sm">
              Chưa có khoản nạp tiền từ học sinh đang chăm sóc.
            </div>
          )}
          {!topUpHistoryLoading && !topUpHistoryError && topUpHistory.length > 0 && (
            <div
              className={cn(
                "space-y-3 transition-opacity",
                topUpHistoryRefreshing && "opacity-70",
              )}
            >
              <div className="space-y-3 lg:hidden">
                {topUpHistory.map((item: CustomerCareTopUpHistoryItem) => (
                  <article
                    key={`mobile-${item.id}`}
                    className="rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                          {formatDateTime(item.createdAt ?? item.date)}
                        </p>
                        <Link
                          href={buildTopUpStudentHref(item)}
                          className="mt-2 inline-flex max-w-full text-base font-semibold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          <span className="truncate">{item.studentName || "—"}</span>
                        </Link>
                      </div>
                      <span className="shrink-0 text-right text-base font-semibold tabular-nums text-success">
                        +{formatCurrency(item.amount)}
                      </span>
                    </div>
                    <p className="mt-3 break-words text-sm text-text-secondary">
                      {item.note?.trim() || "—"}
                    </p>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm lg:block">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Lịch sử tiền vào của học sinh CSKH
                  </caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary/80">
                      <th scope="col" className="px-3 py-3 font-medium text-text-primary">
                        Thời gian
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium text-text-primary">
                        Học sinh
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-medium text-text-primary tabular-nums">
                        Số tiền
                      </th>
                      <th scope="col" className="px-3 py-3 font-medium text-text-primary">
                        Nội dung
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUpHistory.map((item: CustomerCareTopUpHistoryItem) => (
                      <tr
                        key={`desktop-${item.id}`}
                        className="border-b border-border-subtle bg-bg-surface last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">
                          {formatDateTime(item.createdAt ?? item.date)}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={buildTopUpStudentHref(item)}
                            className="font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            {item.studentName || "—"}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-success">
                          +{formatCurrency(item.amount)}
                        </td>
                        <td className="max-w-[32rem] break-words px-3 py-3 text-text-secondary">
                          {item.note?.trim() || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                ref={topUpLoadMoreRef}
                className="flex flex-col items-center gap-2 border-t border-border-default pt-4 text-center"
                aria-live="polite"
              >
                {topUpHistoryFetchingNextPage ? (
                  <p className="text-sm text-text-muted">
                    Đang tải thêm khoản nạp…
                  </p>
                ) : hasNextTopUpHistoryPage ? (
                  <button
                    type="button"
                    onClick={() => void fetchNextTopUpHistoryPage()}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tải thêm khoản nạp
                  </button>
                ) : (
                  <span className="sr-only">Đã tải hết khoản nạp</span>
                )}
              </div>
            </div>
          )}
        </motion.section>
      ) : (
        <motion.section
          key="commissions"
          id="customer-care-panel-commissions"
          role="tabpanel"
          aria-labelledby="customer-care-tab-commissions"
          className="min-w-0 flex-1"
          aria-label="Hoa hồng theo học sinh"
          {...panelMotionProps}
        >
          <h2 className="ml-5 mb-3 text-base font-medium text-text-primary">Hoa hồng</h2>

          {canEditCommissionPaymentStatus && selectedCount > 0 ? (
            <div className="mb-4 rounded-xl border border-border-default bg-bg-secondary/55 px-3 py-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex min-h-10 items-center rounded-lg bg-bg-surface px-3 text-sm font-medium text-text-secondary">
                  Đã chọn: {selectedCount} khoản
                </div>
                {expandedStudentIds.size > 0 && expandedAttendanceIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={toggleAllExpandedSessions}
                    disabled={bulkPaymentStatusMutation.isPending}
                    className="touch-manipulation inline-flex min-h-10 items-center justify-center rounded-lg px-1 text-sm font-medium text-text-muted transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allExpandedSessionsSelected
                      ? "Bỏ chọn tất cả buổi đang mở"
                      : `Chọn tất cả ${expandedAttendanceIds.length} buổi đang mở`}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={openBulkPaymentPopup}
                  disabled={
                    selectedCount === 0 || bulkPaymentStatusMutation.isPending
                  }
                  className="touch-manipulation ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Sửa trạng thái thanh toán cho ${selectedCount} khoản hoa hồng đã chọn`}
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
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <span>Chuyển trạng thái thanh toán</span>
                </button>
              </div>
            </div>
          ) : null}

          {commissionsError && (
            <p className="text-sm text-error" role="alert">
              Không tải được danh sách hoa hồng.
            </p>
          )}
          {commissionsLoading && (
            <CustomerCareListSkeleton
              variant="commission"
              columns={["w-40", "w-28", "w-5"]}
              rows={5}
              minWidthClass="min-w-[560px]"
            />
          )}
          {!commissionsLoading && !commissionsError && commissions.length === 0 && (
            <div className="rounded-[1.5rem] border border-border-default bg-bg-surface p-6 text-center text-sm text-text-muted shadow-sm">
              Không có hoa hồng trong 30 ngày qua.
            </div>
          )}
          {!commissionsLoading && !commissionsError && commissions.length > 0 && (
            <div className="space-y-2">
              <div
                className={`hidden items-center gap-3 rounded-[1.25rem] border border-border-default/80 bg-bg-secondary/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted lg:grid ${COMMISSION_ROW_GRID_CLASS}`}
                aria-hidden
              >
                <span>Tên</span>
                <span className="text-right">Tổng tiền hoa hồng</span>
                <span className="sr-only">Mở rộng</span>
              </div>
              {commissions.map((item: CustomerCareCommissionItem) => {
                const isExpanded = expandedStudentIds.has(item.studentId);
                const studentSessions =
                  sessionCommissionsByStudentId.get(item.studentId) ?? [];
                const studentSessionsLoading =
                  sessionCommissionsLoadingByStudentId.get(item.studentId) ??
                  false;

                return (
                <div
                  key={item.studentId}
                  className="overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.studentId)}
                    aria-expanded={isExpanded}
                    className={`grid w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset ${COMMISSION_ROW_GRID_CLASS}`}
                  >
                    <span className="min-w-0 truncate font-medium text-text-primary" title={item.fullName}>
                      {item.fullName}
                    </span>
                    <span className="w-full text-right tabular-nums font-semibold text-primary">
                      {formatCurrency(item.totalCommission)}
                    </span>
                    <svg
                      className={`size-4 justify-self-end text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isExpanded ? (
                    <div className="border-t border-border-subtle bg-bg-secondary px-4 py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                        Buổi học trong 30 ngày qua
                      </p>
                      {studentSessionsLoading ? (
                        <SessionCommissionSkeleton />
                      ) : studentSessions.length === 0 ? (
                        <p className="text-sm text-text-muted">
                          Không có buổi học trong 30 ngày qua.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-3 lg:hidden">
                            {studentSessions.map(
                              (
                                session: CustomerCareSessionCommissionItem,
                              ) => {
                                const isSelected = selectedAttendanceIds.has(
                                  session.attendanceId,
                                );

                                return (
                                <article
                                  key={`mobile-${session.attendanceId}`}
                                  className={cn(
                                    "rounded-[1.15rem] border bg-bg-surface px-4 py-3 shadow-sm",
                                    canEditCommissionPaymentStatus && isSelected
                                      ? "border-primary/35 bg-primary/5"
                                      : "border-border-default",
                                  )}
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    {canEditCommissionPaymentStatus ? (
                                      <div className="flex items-start gap-3">
                                        <SelectionCheckbox
                                          checked={isSelected}
                                          onChange={() =>
                                            toggleAttendanceSelection(
                                              session.attendanceId,
                                            )
                                          }
                                          disabled={
                                            bulkPaymentStatusMutation.isPending
                                          }
                                          ariaLabel={`Chọn buổi học ${formatDate(session.date)}`}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                            Buổi học
                                          </p>
                                          <p className="mt-1 text-sm font-semibold text-text-primary">
                                            {formatDate(session.date)}
                                          </p>
                                          <p className="mt-1 break-words text-sm text-text-secondary">
                                            {session.className ?? "Chưa gắn lớp"}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                        Buổi học
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-text-primary">
                                        {formatDate(session.date)}
                                      </p>
                                      <p className="mt-1 break-words text-sm text-text-secondary">
                                        {session.className ?? "Chưa gắn lớp"}
                                      </p>
                                    </div>
                                    )}
                                    <span
                                      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${paymentStatusChipClass(
                                        session.paymentStatus,
                                      )}`}
                                    >
                                      {PAYMENT_STATUS_LABELS[
                                        session.paymentStatus
                                      ]}
                                    </span>
                                  </div>

                                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                        Học phí
                                      </p>
                                      <p className="mt-1 text-sm tabular-nums text-text-secondary">
                                        {formatCurrency(session.tuitionFee)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                        Hệ số CSKH
                                      </p>
                                      <p className="mt-1 text-sm tabular-nums text-text-secondary">
                                        {session.customerCareCoef.toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                        Hoa hồng
                                      </p>
                                      <p className="mt-1 text-base font-semibold tabular-nums text-primary">
                                        {formatCurrency(session.commission)}
                                      </p>
                                    </div>
                                  </div>
                                </article>
                              );
                              },
                            )}
                          </div>

                          <div className="hidden overflow-x-auto rounded-[1.1rem] border border-border-default bg-bg-surface lg:block">
                            <div className="min-w-[46rem]">
                            <div
                              className={`grid gap-3 border-b border-border-default bg-bg-secondary/75 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted ${canEditCommissionPaymentStatus ? SESSION_COMMISSION_GRID_WITH_SELECTION_CLASS : SESSION_COMMISSION_GRID_CLASS}`}
                            >
                              {canEditCommissionPaymentStatus ? (
                                <span className="flex justify-center">
                                  <SelectionCheckbox
                                    checked={isAllStudentSessionsSelected(item.studentId)}
                                    indeterminate={isSomeStudentSessionsSelected(item.studentId)}
                                    onChange={() =>
                                      toggleAllStudentSessions(item.studentId)
                                    }
                                    disabled={
                                      studentSessions.length === 0 ||
                                      bulkPaymentStatusMutation.isPending
                                    }
                                    ariaLabel={`Chọn tất cả buổi học của ${item.fullName}`}
                                  />
                                </span>
                              ) : null}
                              <span>Ngày</span>
                              <span>Lớp</span>
                              <span className="text-right">Học phí</span>
                              <span className="text-right">Hệ số</span>
                              <span>Thanh toán</span>
                              <span className="text-right">Hoa hồng</span>
                            </div>
                            <ul className="divide-y divide-border-subtle">
                              {studentSessions.map((session: CustomerCareSessionCommissionItem) => {
                                const isSelected = selectedAttendanceIds.has(
                                  session.attendanceId,
                                );

                                return (
                                <li
                                  key={`desktop-${session.attendanceId}`}
                                  className={cn(
                                    "grid items-center gap-3 px-3 py-3 text-sm transition-colors",
                                    canEditCommissionPaymentStatus && isSelected
                                      ? "bg-primary/5 hover:bg-primary/10"
                                      : "hover:bg-bg-secondary/45",
                                    canEditCommissionPaymentStatus
                                      ? SESSION_COMMISSION_GRID_WITH_SELECTION_CLASS
                                      : SESSION_COMMISSION_GRID_CLASS,
                                  )}
                                >
                                  {canEditCommissionPaymentStatus ? (
                                    <span className="flex justify-center">
                                      <SelectionCheckbox
                                        checked={isSelected}
                                        onChange={() =>
                                          toggleAttendanceSelection(
                                            session.attendanceId,
                                          )
                                        }
                                        disabled={
                                          bulkPaymentStatusMutation.isPending
                                        }
                                        ariaLabel={`Chọn buổi học ${formatDate(session.date)}`}
                                      />
                                    </span>
                                  ) : null}
                                  <span className="font-semibold text-text-primary">
                                    {formatDate(session.date)}
                                  </span>
                                  <span className="truncate text-text-secondary">
                                    {session.className ?? "Chưa gắn lớp"}
                                  </span>
                                  <span className="text-right tabular-nums text-text-secondary">
                                    {formatCurrency(session.tuitionFee)}
                                  </span>
                                  <span className="text-right tabular-nums text-text-muted">
                                    {session.customerCareCoef.toFixed(2)}
                                  </span>
                                  <span
                                    className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${paymentStatusChipClass(
                                      session.paymentStatus,
                                    )}`}
                                  >
                                    {PAYMENT_STATUS_LABELS[session.paymentStatus]}
                                  </span>
                                  <span className="text-right tabular-nums font-semibold text-primary">
                                    {formatCurrency(session.commission)}
                                  </span>
                                </li>
                              );
                              })}
                            </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
              })}
            </div>
          )}
        </motion.section>
      )}
      </AnimatePresence>
      {renderPaymentHistoryModal()}
      {bulkPaymentPopupOpen ? (
        <>
          <div
            className="fixed inset-0 z-[60] bg-bg-primary/75 backdrop-blur-[1px]"
            aria-hidden
            onClick={closeBulkPaymentPopup}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-care-bulk-payment-title"
            className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-bg-surface p-4 shadow-2xl sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  id="customer-care-bulk-payment-title"
                  className="text-base font-semibold text-text-primary"
                >
                  Cập nhật trạng thái thanh toán
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Áp dụng cho {selectedCount} khoản hoa hồng đã chọn.
                </p>
              </div>
              <button
                type="button"
                onClick={closeBulkPaymentPopup}
                className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Đóng popup cập nhật trạng thái thanh toán"
              >
                <XMarkIcon className="size-5" aria-hidden />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-text-secondary">
                  Trạng thái muốn đổi
                </span>
                <UpgradedSelect
                  name="bulk-customer-care-payment-status"
                  value={bulkPaymentStatusDraft}
                  onValueChange={(value) =>
                    setBulkPaymentStatusDraft(value as CustomerCarePaymentStatus)
                  }
                  options={BULK_PAYMENT_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  buttonClassName="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>

              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                <button
                  type="button"
                  onClick={closeBulkPaymentPopup}
                  disabled={bulkPaymentStatusMutation.isPending}
                  className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={confirmBulkPaymentStatusUpdate}
                  disabled={bulkPaymentStatusMutation.isPending}
                  className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkPaymentStatusMutation.isPending
                    ? "Đang cập nhật…"
                    : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
