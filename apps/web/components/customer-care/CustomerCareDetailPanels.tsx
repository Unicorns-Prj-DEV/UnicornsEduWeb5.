"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  CustomerCareCommissionItem,
  CustomerCareSessionCommissionItem,
  CustomerCareStudentItem,
} from "@/dtos/customer-care.dto";
import type { StudentStatus } from "@/dtos/student.dto";
import * as customerCareApi from "@/lib/apis/customer-care.api";
import { formatCurrency } from "@/lib/class.helpers";

const SESSION_DAYS = 30;

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Đang học",
  inactive: "Ngừng theo dõi",
};

type TabId = "students" | "commissions";

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

export default function CustomerCareDetailPanels({
  staffId,
}: {
  staffId: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("students");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="mb-4 inline-flex w-fit rounded-[1.35rem] border border-border-default bg-gradient-to-b from-bg-surface to-bg-secondary/90 p-1 shadow-sm"
        role="tablist"
        aria-label="Học sinh hoặc Hoa hồng"
      >
        <div className="relative grid min-w-[224px] grid-cols-2">
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 rounded-[1rem] bg-primary shadow-sm ring-1 ring-primary/10 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              activeTab === "commissions" ? "translate-x-full" : "translate-x-0"
            }`}
          />

          <button
            id="customer-care-tab-students"
            type="button"
            role="tab"
            aria-selected={activeTab === "students"}
            aria-controls="customer-care-panel-students"
            onClick={() => setActiveTab("students")}
            className={`relative z-10 min-h-11 cursor-pointer rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition-[color,opacity] duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${
              activeTab === "students"
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
            className={`relative z-10 min-h-11 cursor-pointer rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition-[color,opacity] duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${
              activeTab === "commissions"
                ? "text-text-inverse"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Hoa hồng
          </button>
        </div>
      </div>

      {activeTab === "students" && (
        <section
          id="customer-care-panel-students"
          role="tabpanel"
          aria-labelledby="customer-care-tab-students"
          className="min-w-0 flex-1"
          aria-label="Danh sách học sinh chăm sóc"
        >
          <h2 className="mb-3 text-base font-medium text-text-primary">Học sinh</h2>
          <p className="mb-3 text-sm text-text-muted">
            Danh sách học sinh được giao chăm sóc, sắp xếp theo số dư tăng dần.
          </p>
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
                        {row.fullName || "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-text-secondary">
                        {formatCurrency(row.accountBalance)}
                      </td>
                      <td className="px-3 py-3 text-text-secondary">{row.province ?? "—"}</td>
                      <td className="px-3 py-3 text-text-secondary">
                        {row.classes?.length
                          ? row.classes.map((classItem) => classItem.name).join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === "commissions" && (
        <section
          id="customer-care-panel-commissions"
          role="tabpanel"
          aria-labelledby="customer-care-tab-commissions"
          className="min-w-0 flex-1"
          aria-label="Hoa hồng theo học sinh"
        >
          <h2 className="mb-3 text-base font-medium text-text-primary">Hoa hồng</h2>
          <p className="mb-3 text-sm text-text-muted">
            Bấm vào học sinh để xem các buổi học trong 30 ngày qua và hoa hồng từng buổi.
          </p>
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
              {commissions.map((item: CustomerCareCommissionItem) => (
                <div
                  key={item.studentId}
                  className="overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.studentId)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset"
                  >
                    <span className="font-medium text-text-primary">{item.fullName}</span>
                    <span className="shrink-0 tabular-nums font-semibold text-primary">
                      {formatCurrency(item.totalCommission)}
                    </span>
                    <svg
                      className={`size-4 shrink-0 text-text-muted transition-transform ${expandedStudentId === item.studentId ? "rotate-180" : ""}`}
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
                        <ul className="space-y-2" role="list">
                          {sessionCommissions.map((session: CustomerCareSessionCommissionItem) => (
                            <li
                              key={session.sessionId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg-surface px-3 py-2 text-sm"
                            >
                              <span className="text-text-secondary">
                                {formatDate(session.date)}
                                {session.className ? ` · ${session.className}` : ""}
                              </span>
                              <span className="tabular-nums font-medium text-primary">
                                {formatCurrency(session.commission)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
