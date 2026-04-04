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

  const buildStudentHref = (student: CustomerCareStudentItem) => {
    if (isAdminWorkspace) {
      return `${buildAdminLikePath(routeBase, "students")}?search=${encodeURIComponent(
        student.fullName || "",
      )}`;
    }

    return `/staff/students/${encodeURIComponent(student.id)}`;
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
      return <span className="text-sm text-text-muted">—</span>;
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
            <div className="space-y-3">
              <div className="space-y-3 lg:hidden">
                {students.map((row: CustomerCareStudentItem) => (
                  <article
                    key={row.id}
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

                      <div className="w-full rounded-[1.15rem] border border-border-default bg-bg-secondary/35 px-4 py-3 sm:w-auto sm:min-w-[11rem]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                          Số dư
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
                          {formatCurrency(row.accountBalance)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
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
                        <Link
                          href={buildStudentHref(row)}
                          className="text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          {row.fullName || "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-text-secondary">
                        {formatCurrency(row.accountBalance)}
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
                className={`hidden items-center gap-3 rounded-[1.25rem] border border-border-default/80 bg-bg-secondary/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted lg:grid ${COMMISSION_ROW_GRID_CLASS}`}
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
                        <div className="space-y-3">
                          <div className="space-y-3 lg:hidden">
                            {sessionCommissions.map(
                              (
                                session: CustomerCareSessionCommissionItem,
                              ) => (
                                <article
                                  key={session.sessionId}
                                  className="rounded-[1.15rem] border border-border-default bg-bg-surface px-4 py-3 shadow-sm"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                              ),
                            )}
                          </div>

                          <div className="hidden overflow-x-auto rounded-[1.1rem] border border-border-default bg-bg-surface lg:block">
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
