"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as customerCareApi from "@/lib/apis/customer-care.api";
import type {
  CustomerCareStudentItem,
  CustomerCareCommissionItem,
  CustomerCareSessionCommissionItem,
} from "@/dtos/customer-care.dto";
import type { StudentStatus } from "@/dtos/student.dto";
import { formatCurrency } from "@/lib/class.helpers";

const SESSION_DAYS = 30;

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

function statusDotClass(status: StudentStatus | null): string {
  return status === "active" ? "bg-success" : "bg-error";
}

type TabId = "students" | "commissions";

export default function AdminCustomerCareDetailPage() {
  const params = useParams();
  const staffId = typeof params?.staffId === "string" ? params.staffId : "";
  const router = useRouter();
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
        SESSION_DAYS
      ),
    enabled: !!staffId && !!expandedStudentId,
  });

  const toggleExpand = (studentId: string) => {
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  if (!staffId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <p className="text-sm text-text-muted">Không tìm thấy nhân sự.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
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
        <span className="hidden sm:inline">Quay lại</span>
      </button>

      <header className="mb-5 flex flex-col gap-4 sm:mb-6">
        <h1 className="text-lg font-semibold text-text-primary sm:text-xl">
          Chi tiết công việc CSKH
        </h1>
        <p className="text-sm text-text-muted">
          Học sinh chăm sóc và hoa hồng theo buổi (30 ngày qua).
        </p>
      </header>

      <div
        className="mb-4 inline-flex w-fit rounded-full bg-bg-secondary p-0.5"
        role="tablist"
        aria-label="Học sinh hoặc Hoa hồng"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "students"}
          onClick={() => setActiveTab("students")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${
            activeTab === "students"
              ? "bg-bg-surface text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Học sinh
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "commissions"}
          onClick={() => setActiveTab("commissions")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${
            activeTab === "commissions"
              ? "bg-bg-surface text-primary shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Hoa Hồng
        </button>
      </div>

      {activeTab === "students" && (
        <section className="min-w-0 flex-1" aria-label="Danh sách học sinh chăm sóc">
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
            <div className="rounded-lg border border-border-default bg-bg-secondary p-6 text-center text-sm text-text-muted">
              Đang tải…
            </div>
          )}
          {!studentsLoading && !studentsError && students.length === 0 && (
            <div className="rounded-lg border border-border-default bg-bg-secondary p-6 text-center text-sm text-text-muted">
              Chưa có học sinh được giao chăm sóc.
            </div>
          )}
          {!studentsLoading && !studentsError && students.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border-default">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <caption className="sr-only">Danh sách học sinh chăm sóc</caption>
                <thead>
                  <tr className="border-b border-border-default bg-bg-secondary">
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
                      <td className="px-3 py-3 text-text-secondary">
                        {row.province ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-text-secondary">
                        {row.classes?.length
                          ? row.classes.map((c) => c.name).join(", ")
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
        <section className="min-w-0 flex-1" aria-label="Hoa hồng theo học sinh">
          <h2 className="mb-3 text-base font-medium text-text-primary">Hoa Hồng</h2>
          <p className="mb-3 text-sm text-text-muted">
            Bấm vào học sinh để xem các buổi học trong 30 ngày qua và hoa hồng từng buổi.
          </p>
          {commissionsError && (
            <p className="text-sm text-error" role="alert">
              Không tải được danh sách hoa hồng.
            </p>
          )}
          {commissionsLoading && (
            <div className="rounded-lg border border-border-default bg-bg-secondary p-6 text-center text-sm text-text-muted">
              Đang tải…
            </div>
          )}
          {!commissionsLoading && !commissionsError && commissions.length === 0 && (
            <div className="rounded-lg border border-border-default bg-bg-secondary p-6 text-center text-sm text-text-muted">
              Không có hoa hồng trong 30 ngày qua.
            </div>
          )}
          {!commissionsLoading && !commissionsError && commissions.length > 0 && (
            <div className="space-y-2">
              {commissions.map((item: CustomerCareCommissionItem) => (
                <div
                  key={item.studentId}
                  className="rounded-lg border border-border-default bg-bg-surface overflow-hidden"
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
                          {sessionCommissions.map(
                            (s: CustomerCareSessionCommissionItem) => (
                              <li
                                key={s.sessionId}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-bg-surface px-3 py-2 text-sm"
                              >
                                <span className="text-text-secondary">
                                  {formatDate(s.date)}
                                  {s.className ? ` · ${s.className}` : ""}
                                </span>
                                <span className="tabular-nums font-medium text-primary">
                                  {formatCurrency(s.commission)}
                                </span>
                              </li>
                            )
                          )}
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
