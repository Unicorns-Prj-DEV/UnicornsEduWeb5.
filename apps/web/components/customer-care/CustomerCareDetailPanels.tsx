"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import type {
  CustomerCareCommissionItem,
  CustomerCarePaymentStatus,
  CustomerCareSessionCommissionItem,
  CustomerCareStudentItem,
} from "@/dtos/customer-care.dto";
import type { StudentStatus } from "@/dtos/student.dto";
import {
  buildAdminLikePath,
  resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";
import * as customerCareApi from "@/lib/apis/customer-care.api";
import { formatCurrency } from "@/lib/class.helpers";

const SESSION_DAYS = 30;

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Đang học",
  inactive: "Ngừng theo dõi",
};

const PAYMENT_STATUS_LABELS: Record<CustomerCarePaymentStatus, string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
};

type TabId = "students" | "commissions";

const COMMISSION_ROW_GRID_CLASS =
  "grid-cols-[minmax(0,1fr)_auto_1.25rem] md:grid-cols-[minmax(0,1fr)_minmax(10rem,12rem)_1.5rem]";
const SESSION_COMMISSION_GRID_CLASS =
  "grid-cols-[7.5rem_minmax(14rem,1.85fr)_8.5rem_6.5rem_10rem_8.5rem]";
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

function statusDotClass(status: StudentStatus | null): string {
  return status === "active" ? "bg-success" : "bg-error";
}

function paymentStatusChipClass(status: CustomerCarePaymentStatus): string {
  return status === "paid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

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
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("students");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const isAdminWorkspace = workspaceMode === "admin";

  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError,
  } = useQuery({
    queryKey: ["customer-care", "students", staffId],
    queryFn: () => customerCareApi.getCustomerCareStudents(staffId),
    enabled: !!staffId,
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

  const { data: sessionCommissions = [], isLoading: sessionCommissionsLoading } = useQuery({
    queryKey: ["customer-care", "session-commissions", staffId, expandedStudentId, SESSION_DAYS],
    queryFn: () =>
      customerCareApi.getCustomerCareSessionCommissions(
        staffId,
        expandedStudentId!,
        SESSION_DAYS,
      ),
    enabled: !!staffId && activeTab === "commissions" && !!expandedStudentId,
  });

  if (!staffId) {
    return (
      <div className="rounded-[1.5rem] border border-border-default bg-bg-surface px-4 py-6 text-sm text-text-muted shadow-sm">
        Không tìm thấy hồ sơ nhân sự CSKH.
      </div>
    );
  }

  const toggleExpand = (studentId: string) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };
  const indicatorTransition = prefersReducedMotion
    ? { duration: 0 }
    : TAB_INDICATOR_TRANSITION;
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="mb-4 inline-flex w-fit rounded-[1.35rem] border border-border-default bg-gradient-to-b from-bg-surface to-bg-secondary/90 p-1 shadow-sm"
        role="tablist"
        aria-label="Học sinh hoặc Hoa hồng"
      >
        <div className="relative grid min-w-[224px] grid-cols-2">
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 rounded-[1rem] bg-primary shadow-sm ring-1 ring-primary/10"
            animate={{ x: activeTab === "commissions" ? "100%" : "0%" }}
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
          <h2 className="ml-5 mb-3 text-base font-medium text-text-primary">Học sinh</h2>

          {studentsError && (
            <p className="text-sm text-error" role="alert">
              Không tải được danh sách học sinh.
            </p>
          )}
          {studentsLoading && (
            <div className="rounded-[1.5rem] border border-border-default bg-bg-surface p-6 text-center text-sm text-text-muted shadow-sm">
              Đang tải…
            </div>
          )}
          {!studentsLoading && !studentsError && students.length === 0 && (
            <div className="rounded-[1.5rem] border border-border-default bg-bg-surface p-6 text-center text-sm text-text-muted shadow-sm">
              Chưa có học sinh được giao chăm sóc.
            </div>
          )}
          {!studentsLoading && !studentsError && students.length > 0 && (
            <div className="overflow-x-auto rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <caption className="sr-only">Danh sách học sinh chăm sóc</caption>
                <thead>
                  <tr className="border-b border-border-default bg-bg-secondary/80">
                    <th scope="col" className="w-9 px-3 py-3 font-medium text-text-primary">
                      <span className="sr-only">Trạng thái</span>
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-text-primary">
                      Tên
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-text-primary tabular-nums">
                      Số dư
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
                      key={row.id}
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
                        {isAdminWorkspace ? (
                          <Link
                            href={`${buildAdminLikePath(routeBase, "students")}?search=${encodeURIComponent(row.fullName || "")}`}
                            className="text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            {row.fullName || "—"}
                          </Link>
                        ) : (
                          row.fullName || "—"
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-text-secondary">
                        {formatCurrency(row.accountBalance)}
                      </td>
                      <td className="px-3 py-3 text-text-secondary">{row.province ?? "—"}</td>
                      <td className="px-3 py-3 text-text-secondary">
                        {row.classes?.length
                          ? row.classes.map((classItem, idx) => (
                            <span key={classItem.id}>
                              {idx > 0 ? ", " : ""}
                              {isAdminWorkspace ? (
                                <Link
                                  href={buildAdminLikePath(
                                    routeBase,
                                    `classes/${encodeURIComponent(classItem.id)}`,
                                  )}
                                  className="text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                >
                                  {classItem.name}
                                </Link>
                              ) : allowStaffClassNavigation ? (
                                <Link
                                  href={`/staff/classes/${encodeURIComponent(classItem.id)}`}
                                  className="text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                >
                                  {classItem.name}
                                </Link>
                              ) : (
                                classItem.name
                              )}
                            </span>
                          ))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

          {commissionsError && (
            <p className="text-sm text-error" role="alert">
              Không tải được danh sách hoa hồng.
            </p>
          )}
          {commissionsLoading && (
            <div className="rounded-[1.5rem] border border-border-default bg-bg-surface p-6 text-center text-sm text-text-muted shadow-sm">
              Đang tải…
            </div>
          )}
          {!commissionsLoading && !commissionsError && commissions.length === 0 && (
            <div className="rounded-[1.5rem] border border-border-default bg-bg-surface p-6 text-center text-sm text-text-muted shadow-sm">
              Không có hoa hồng trong 30 ngày qua.
            </div>
          )}
          {!commissionsLoading && !commissionsError && commissions.length > 0 && (
            <div className="space-y-2">
              <div
                className={`hidden items-center gap-3 rounded-[1.25rem] border border-border-default/80 bg-bg-secondary/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted md:grid ${COMMISSION_ROW_GRID_CLASS}`}
                aria-hidden
              >
                <span>Tên</span>
                <span className="text-right">Tổng tiền hoa hồng</span>
                <span className="sr-only">Mở rộng</span>
              </div>
              {commissions.map((item: CustomerCareCommissionItem) => (
                <div
                  key={item.studentId}
                  className="overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.studentId)}
                    className={`grid w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset ${COMMISSION_ROW_GRID_CLASS}`}
                  >
                    <span className="min-w-0 truncate font-medium text-text-primary" title={item.fullName}>
                      {item.fullName}
                    </span>
                    <span className="w-full text-right tabular-nums font-semibold text-primary">
                      {formatCurrency(item.totalCommission)}
                    </span>
                    <svg
                      className={`size-4 justify-self-end text-text-muted transition-transform ${expandedStudentId === item.studentId ? "rotate-180" : ""}`}
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
                  {expandedStudentId === item.studentId && (
                    <div className="border-t border-border-subtle bg-bg-secondary px-4 py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                        Buổi học trong 30 ngày qua
                      </p>
                      {sessionCommissionsLoading ? (
                        <p className="text-sm text-text-muted">Đang tải…</p>
                      ) : sessionCommissions.length === 0 ? (
                        <p className="text-sm text-text-muted">
                          Không có buổi học trong 30 ngày qua.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-[1.1rem] border border-border-default bg-bg-surface">
                          <div className="min-w-[46rem]">
                            <div
                              className={`grid gap-3 border-b border-border-default bg-bg-secondary/75 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted ${SESSION_COMMISSION_GRID_CLASS}`}
                            >
                              <span>Ngày</span>
                              <span>Lớp</span>
                              <span className="text-right">Học phí</span>
                              <span className="text-right">Hệ số</span>
                              <span>Thanh toán</span>
                              <span className="text-right">Hoa hồng</span>
                            </div>
                            <ul role="list" className="divide-y divide-border-subtle">
                              {sessionCommissions.map((session: CustomerCareSessionCommissionItem) => (
                                <li
                                  key={session.sessionId}
                                  className={`grid items-center gap-3 px-3 py-3 text-sm transition-colors hover:bg-bg-secondary/45 ${SESSION_COMMISSION_GRID_CLASS}`}
                                >
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
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}
      </AnimatePresence>
    </div>
  );
}
