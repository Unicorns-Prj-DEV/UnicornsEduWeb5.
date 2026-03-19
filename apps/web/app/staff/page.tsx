"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useQuery } from "@tanstack/react-query";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import type { ClassListResponse, ClassStatus, ClassType } from "@/dtos/class.dto";
import { getFullProfile } from "@/lib/apis/auth.api";
import * as staffOpsApi from "@/lib/apis/staff-ops.api";
import {
  normalizeClassStatus,
  normalizeClassType,
  normalizePage,
} from "@/lib/class.helpers";

const SEARCH_DEBOUNCE_MS = 500;
const PAGE_SIZE = 12;

const TYPE_OPTIONS: Array<{ value: "" | ClassType; label: string }> = [
  { value: "", label: "Tất cả loại" },
  { value: "basic", label: "Basic" },
  { value: "vip", label: "VIP" },
  { value: "advance", label: "Advance" },
  { value: "hardcore", label: "Hardcore" },
];

const STATUS_OPTIONS: Array<{ value: "" | ClassStatus; label: string }> = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "running", label: "Đang chạy" },
  { value: "ended", label: "Đã kết thúc" },
];

function formatScheduleSummary(
  schedule?: Array<{ from?: string | null; to?: string | null }>,
): string {
  if (!Array.isArray(schedule) || schedule.length === 0) return "Chưa có khung giờ";
  return schedule
    .filter((item) => item?.from && item?.to)
    .slice(0, 2)
    .map((item) => `${String(item.from).slice(0, 5)} → ${String(item.to).slice(0, 5)}`)
    .join(" · ");
}

function formatSessionReadiness(
  studentCount: number,
): {
  label: string;
  className: string;
} {
  if (studentCount > 0) {
    return {
      label: "Có thể thao tác buổi học",
      className: "border-success/20 bg-success/10 text-success",
    };
  }

  return {
    label: "Chưa có học sinh",
    className: "border-warning/20 bg-warning/10 text-warning",
  };
}

export default function StaffOperationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = normalizePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";
  const type = normalizeClassType(searchParams.get("type"));
  const status = normalizeClassStatus(searchParams.get("status"));

  const [searchInput, setSearchInput] = useState(search);

  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
  });

  const isAdmin = profile?.roleType === "admin";

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const replaceParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    updater(params);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const applySearch = useDebouncedCallback((value: string) => {
    replaceParams((params) => {
      params.set("search", value);
      params.set("page", "1");
    });
  }, SEARCH_DEBOUNCE_MS);

  const { data, isLoading, isError } = useQuery<ClassListResponse>({
    queryKey: ["staff-ops", "class", "list", page, PAGE_SIZE, search, type, status],
    queryFn: () =>
      staffOpsApi.getClasses({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        type: type || undefined,
        status: status || undefined,
      }),
  });

  const classes = data?.data ?? [];
  const currentPage = data?.meta?.page ?? page;
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const visibleStats = useMemo(() => {
    return classes.reduce(
      (acc, item) => {
        return {
          running: acc.running + (item.status === "running" ? 1 : 0),
          ended: acc.ended + (item.status === "ended" ? 1 : 0),
          ready: acc.ready + ((item.studentCount ?? 0) > 0 ? 1 : 0),
        };
      },
      { running: 0, ended: 0, ready: 0 },
    );
  }, [classes]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <section className="overflow-hidden rounded-[2rem] border border-border-default bg-bg-surface shadow-sm">
        <div className="grid gap-6 border-b border-border-default px-5 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
              {isAdmin ? "Staff Workspace" : "Teacher Workspace"}
            </p>
            <h1 className="mt-3 text-balance text-2xl font-semibold text-text-primary sm:text-3xl">
              {isAdmin
                ? "Theo dõi lớp học bằng góc nhìn teacher workspace"
                : "Quản lý các lớp bạn đang phụ trách"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
              {isAdmin
                ? "Admin có thể vào route này để xem hoặc hỗ trợ luồng thao tác lớp học theo quyền hạn teacher-workspace. Các giới hạn về trợ cấp và học phí vẫn được giữ nguyên."
                : "Bạn chỉ thấy danh sách lớp được phân công cho teacher hiện tại. Từ đây bạn có thể mở từng lớp để chỉnh khung giờ, thêm buổi học, cập nhật ghi chú và điểm danh mà không được thay đổi trợ cấp hay học phí học sinh."}
            </p>
            <div className="mt-5 inline-flex rounded-[1.2rem] border border-border-default bg-bg-secondary/70 p-1">
              <span className="rounded-[0.95rem] bg-primary px-4 py-2 text-sm font-medium text-text-inverse">
                Lớp học
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              {
                label: isAdmin ? "Tổng lớp" : "Lớp phụ trách",
                value: total,
                tone: "text-text-primary",
              },
              { label: "Đang chạy", value: visibleStats.running, tone: "text-warning" },
              {
                label: "Sẵn sàng thao tác",
                value: visibleStats.ready,
                tone: "text-success",
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-[1.5rem] border border-border-default bg-bg-secondary/70 p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                  {item.label}
                </p>
                <p className={`mt-3 text-3xl font-semibold ${item.tone}`}>{item.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:px-6">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Tìm lớp</span>
            <input
              name="class-search"
              type="search"
              value={searchInput}
              autoComplete="off"
              onChange={(event) => {
                setSearchInput(event.target.value);
                applySearch(event.target.value);
              }}
              placeholder="Theo tên lớp học…"
              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Loại lớp</span>
            <UpgradedSelect
              name="class-type-filter"
              value={type}
              onValueChange={(nextValue) =>
                replaceParams((params) => {
                  params.set("type", nextValue);
                  params.set("page", "1");
                })
              }
              options={TYPE_OPTIONS}
              buttonClassName="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Trạng thái</span>
            <UpgradedSelect
              name="class-status-filter"
              value={status}
              onValueChange={(nextValue) =>
                replaceParams((params) => {
                  params.set("status", nextValue);
                  params.set("page", "1");
                })
              }
              options={STATUS_OPTIONS}
              buttonClassName="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm lg:p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.5rem] border border-border-default bg-bg-secondary/50 p-4"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-bg-tertiary" />
                <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-bg-tertiary" />
                <div className="mt-4 h-3 w-full animate-pulse rounded bg-bg-tertiary" />
                <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-bg-tertiary" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[1.5rem] border border-error/30 bg-error/10 px-4 py-6 text-sm text-error">
            Không tải được danh sách lớp cho Staff.
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">
              Chưa có lớp nào khớp bộ lọc hiện tại.
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Nới bộ lọc hoặc chờ được phân công thêm lớp để tiếp tục thao tác.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((item) => {
                const readiness = formatSessionReadiness(item.studentCount ?? 0);
                const seatCount = item.studentCount ?? 0;
                const teacherCount = item.teachers?.length ?? 0;

                return (
                  <article
                    key={item.id}
                    className="group flex h-full flex-col rounded-[1.65rem] border border-border-default bg-bg-surface p-4 shadow-sm transition-colors hover:border-primary/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                          {item.type}
                        </p>
                        <h2 className="mt-2 truncate text-lg font-semibold text-text-primary">
                          {item.name}
                        </h2>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.status === "running"
                            ? "bg-warning/10 text-warning"
                            : "bg-bg-secondary text-text-secondary"
                        }`}
                      >
                        {item.status === "running" ? "Đang chạy" : "Đã kết thúc"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${readiness.className}`}>
                        {readiness.label}
                      </span>
                      <span className="rounded-full border border-border-default bg-bg-secondary/70 px-2.5 py-1 text-xs font-medium text-text-secondary">
                        {seatCount} học sinh
                      </span>
                    </div>

                    <dl className="mt-4 space-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                          Khung giờ
                        </dt>
                        <dd className="mt-1 text-text-primary">
                          {formatScheduleSummary(item.schedule)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                          Gia sư hiện tại
                        </dt>
                        <dd className="mt-1 text-text-primary">
                          {teacherCount === 0
                            ? "Chưa phân công"
                            : item.teachers?.map((teacher) => teacher.fullName).join(", ")}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 border-t border-border-default pt-4">
                      <Link
                        href={`/staff/classes/${item.id}`}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        Xem chi tiết lớp
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">
                Trang {currentPage}/{totalPages} · {total} lớp
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    replaceParams((params) => {
                      params.set("page", String(Math.max(1, currentPage - 1)));
                    })
                  }
                  disabled={currentPage <= 1}
                  className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() =>
                    replaceParams((params) => {
                      params.set("page", String(Math.min(totalPages, currentPage + 1)));
                    })
                  }
                  disabled={currentPage >= totalPages}
                  className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
