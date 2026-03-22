"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { LessonWorkOutputItem, LessonWorkResponse } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import LessonWorkNewLessonPanel from "./LessonWorkNewLessonPanel";
import LessonWorkQuickFilters, {
  type LessonWorkFilterDraft,
} from "./LessonWorkQuickFilters";
import {
  formatLessonDateOnly,
  formatLessonDateTime,
  LESSON_OUTPUT_STATUS_LABELS,
  lessonOutputStatusChipClass,
} from "./lessonTaskUi";

const WORK_PAGE_SIZE = 10;
const EMPTY_OUTPUTS: LessonWorkOutputItem[] = [];

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeMonthYear(
  yearRaw: string | null,
  monthRaw: string | null,
): { year: number; month: number } {
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  const year = Number(yearRaw);
  const month = Number(monthRaw);

  const y =
    Number.isFinite(year) && year >= 2000 && year <= 2100 ? year : defaultYear;
  const m =
    Number.isFinite(month) && month >= 1 && month <= 12 ? month : defaultMonth;

  return { year: y, month: m };
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function buildOutputHref(outputId: string, workPage: number, year: number, month: number) {
  const params = new URLSearchParams();
  params.set("tab", "work");
  params.set("workPage", String(workPage));
  params.set("workYear", String(year));
  params.set("workMonth", String(month));
  return `/admin/lesson-plans/outputs/${encodeURIComponent(outputId)}?${params.toString()}`;
}

function formatMonthLabel(year: number, month: number) {
  const m = String(month).padStart(2, "0");
  return `Tháng ${m}/${year}`;
}

function resolvePrimaryLink(output: LessonWorkOutputItem) {
  return output.link?.trim() || output.originalLink?.trim() || "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function LevelPill({ level }: { level: string | null }) {
  if (!level?.trim()) {
    return <span className="text-sm text-text-muted">—</span>;
  }

  const text = /level/i.test(level) ? level.trim() : `Level ${level.trim()}`;

  return (
    <span className="inline-flex max-w-[8rem] truncate rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
      {text}
    </span>
  );
}

function PaymentPill({ cost }: { cost: number }) {
  const unpaid = cost > 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${unpaid
        ? "bg-error text-text-inverse"
        : "bg-success/15 text-success ring-1 ring-success/25"
        }`}
    >
      {unpaid ? `Chưa thanh toán · ${formatCurrency(cost)}đ` : "Đã thanh toán"}
    </span>
  );
}

function OutputStatusPill({
  status,
}: {
  status: LessonWorkOutputItem["status"];
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${lessonOutputStatusChipClass(
        status,
      )}`}
    >
      {LESSON_OUTPUT_STATUS_LABELS[status]}
    </span>
  );
}

function WorkActionButton({
  label,
  onClick,
  disabled = false,
  tone = "neutral",
  icon,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border p-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40 ${tone === "danger"
        ? "border-error/20 bg-error/6 text-error hover:bg-error/12"
        : "border-border-default bg-bg-surface text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
        }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

function WorkPagination({
  page,
  totalPages,
  total,
  isPending,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  isPending: boolean;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-text-secondary">
          {total} bài trong tháng đang xem
        </p>
        {isPending ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Đang chuyển trang
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trước
        </button>
        <span className="rounded-xl border border-border-default bg-bg-secondary px-3 py-2 text-sm font-medium text-text-secondary">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function WorkTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border-default bg-bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "29%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead className="bg-bg-secondary/70">
            <tr className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              <th className="px-4 py-3.5" scope="col">
                Ngày
              </th>
              <th className="px-4 py-3.5" scope="col">
                Bài giáo án
              </th>
              <th className="px-4 py-3.5" scope="col">
                Công việc
              </th>
              <th className="px-4 py-3.5" scope="col">
                Trạng thái
              </th>
              <th className="px-4 py-3.5" scope="col">
                Contest / Link
              </th>
              <th className="px-4 py-3.5 text-right" scope="col">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <tr
                key={`work-sk-${index}`}
                className="border-t border-border-default/80"
              >
                <td className="px-4 py-4 align-top">
                  <div className="h-8 w-24 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="h-5 w-full max-w-[16rem] animate-pulse rounded bg-bg-tertiary" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="h-6 w-[4.5rem] animate-pulse rounded-full bg-bg-tertiary/85" />
                    <div className="h-6 w-20 animate-pulse rounded-full bg-bg-tertiary/70" />
                  </div>
                  <div className="mt-3 h-4 w-32 animate-pulse rounded bg-bg-tertiary/65" />
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="h-4 w-full max-w-[10rem] animate-pulse rounded bg-bg-tertiary/85" />
                  <div className="mt-3 h-4 w-24 animate-pulse rounded bg-bg-tertiary/70" />
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="h-7 w-28 animate-pulse rounded-full bg-bg-tertiary" />
                  <div className="mt-3 h-7 w-full max-w-[8rem] animate-pulse rounded-full bg-bg-tertiary/80" />
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="h-4 w-full max-w-[10rem] animate-pulse rounded bg-bg-tertiary/85" />
                  <div className="mt-3 h-4 w-full max-w-[8rem] animate-pulse rounded bg-bg-tertiary/70" />
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="ml-auto flex flex-wrap justify-end gap-2">
                    <div className="h-10 w-full max-w-[5rem] animate-pulse rounded-xl bg-bg-tertiary" />
                    <div className="size-10 animate-pulse rounded-xl bg-bg-tertiary/85" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LessonWorkTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const workPage = normalizePositiveInt(searchParams.get("workPage"));
  const { year: workYear, month: workMonth } = normalizeMonthYear(
    searchParams.get("workYear"),
    searchParams.get("workMonth"),
  );

  const [filterOpen, setFilterOpen] = useState(true);

  const workSearch = searchParams.get("workSearch") ?? "";
  const workTag = searchParams.get("workTag") ?? "";
  const workOutputStatus = searchParams.get("workOutputStatus") ?? "all";
  const workStaffId = searchParams.get("workStaffId") ?? "";
  const workDateFrom = searchParams.get("workDateFrom") ?? "";
  const workDateTo = searchParams.get("workDateTo") ?? "";
  const appliedDraft = useMemo<LessonWorkFilterDraft>(
    () => ({
      search: workSearch,
      tag: workTag,
      outputStatus: workOutputStatus || "all",
      staffId: workStaffId,
      dateFrom: workDateFrom,
      dateTo: workDateTo,
    }),
    [
      workDateFrom,
      workDateTo,
      workOutputStatus,
      workSearch,
      workStaffId,
      workTag,
    ],
  );
  const filterDraftKey = useMemo(
    () => JSON.stringify(appliedDraft),
    [appliedDraft],
  );

  const { data: staffFilterOptions = [] } = useQuery({
    queryKey: ["lesson", "output-staff-options", "work-filter"],
    queryFn: () =>
      lessonApi.searchLessonOutputStaffOptions({
        limit: 80,
      }),
  });

  const syncWorkParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "work");
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      router.replace(`/admin/lesson-plans?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const applyFilters = useCallback((draft: LessonWorkFilterDraft) => {
    syncWorkParams({
      workSearch: draft.search.trim() || null,
      workTag: draft.tag.trim() || null,
      workOutputStatus:
        draft.outputStatus === "all" || !draft.outputStatus.trim()
          ? null
          : draft.outputStatus.trim(),
      workStaffId: draft.staffId.trim() || null,
      workDateFrom: draft.dateFrom.trim() || null,
      workDateTo: draft.dateTo.trim() || null,
      workPage: 1,
    });
  }, [syncWorkParams]);

  const clearFilters = useCallback(() => {
    syncWorkParams({
      workSearch: null,
      workTag: null,
      workOutputStatus: null,
      workStaffId: null,
      workDateFrom: null,
      workDateTo: null,
      workPage: 1,
    });
  }, [syncWorkParams]);

  const handleMonthStep = (delta: number) => {
    const d = new Date(Date.UTC(workYear, workMonth - 1 + delta, 1));
    syncWorkParams({
      workYear: d.getUTCFullYear(),
      workMonth: d.getUTCMonth() + 1,
      workPage: 1,
      workDateFrom: null,
      workDateTo: null,
    });
  };

  const handlePageChange = (page: number) => {
    syncWorkParams({ workPage: page });
  };

  const queryKey = useMemo(
    () =>
      [
        "lesson",
        "work",
        workPage,
        workYear,
        workMonth,
        workSearch,
        workTag,
        workOutputStatus,
        workStaffId,
        workDateFrom,
        workDateTo,
      ] as const,
    [
      workPage,
      workYear,
      workMonth,
      workSearch,
      workTag,
      workOutputStatus,
      workStaffId,
      workDateFrom,
      workDateTo,
    ],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useQuery<LessonWorkResponse>({
      queryKey,
      queryFn: () =>
        lessonApi.getLessonWork({
          page: workPage,
          limit: WORK_PAGE_SIZE,
          year: workYear,
          month: workMonth,
          search: workSearch || undefined,
          tag: workTag || undefined,
          outputStatus:
            workOutputStatus && workOutputStatus !== "all"
              ? workOutputStatus
              : undefined,
          staffId: workStaffId || undefined,
          dateFrom: workDateFrom || undefined,
          dateTo: workDateTo || undefined,
        }),
      placeholderData: (previousData) => previousData,
    });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lessonApi.deleteLessonOutput(id),
    onSuccess: () => {
      toast.success("Đã xóa bài giáo án.");
      void queryClient.invalidateQueries({ queryKey: ["lesson", "work"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không xóa được bản ghi."));
    },
  });

  const outputs = data?.outputs ?? EMPTY_OUTPUTS;

  const confirmDelete = (output: LessonWorkOutputItem) => {
    const ok = window.confirm(
      `Xóa bài “${output.lessonName.trim() || output.id}”? Hành động không hoàn tác.`,
    );
    if (!ok) {
      return;
    }
    deleteMutation.mutate(output.id);
  };

  if (isLoading && !data) {
    return (
      <section
        id="lesson-panel-work"
        role="tabpanel"
        aria-labelledby="lesson-tab-work"
        className="space-y-4"
      >
        <WorkTableSkeleton rows={6} />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section
        id="lesson-panel-work"
        role="tabpanel"
        aria-labelledby="lesson-tab-work"
        className="space-y-6"
      >
        <section className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
          <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
            <p className="text-base font-semibold text-text-primary">
              Không tải được danh sách công việc (tab Công việc).
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {getErrorMessage(error, "Đã có lỗi khi tải tab Công việc.")}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Tải lại
            </button>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section
      id="lesson-panel-work"
      role="tabpanel"
      aria-labelledby="lesson-tab-work"
      className="space-y-4"
    >
      <LessonWorkQuickFilters
        key={filterDraftKey}
        open={filterOpen}
        onOpenChange={setFilterOpen}
        initialDraft={appliedDraft}
        onApply={applyFilters}
        onClear={clearFilters}
        staffOptions={staffFilterOptions}
      />

      <LessonWorkNewLessonPanel />

      <section className="overflow-hidden rounded-[1.75rem] border border-border-default bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.96))] shadow-sm">
        <div className="border-b border-border-default px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-text-muted">
                Work Ledger
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight text-text-primary sm:text-[1.35rem]">
                  Bài giáo án đã làm
                </h3>
                <span className="inline-flex rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                  {data.outputsMeta.total} bài
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Danh sách theo nhịp cập nhật mới nhất trong tháng đang xem, ưu tiên
                khả năng quét nhanh tình trạng bàn giao, thanh toán và người phụ
                trách.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => handleMonthStep(-1)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Tháng trước"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="rounded-2xl border border-border-default bg-bg-surface px-4 py-2.5 text-center shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Tháng đang xem
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
                  {formatMonthLabel(workYear, workMonth)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleMonthStep(1)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Tháng sau"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {outputs.length > 0 ? (
            <div className="overflow-hidden rounded-[1.35rem] border border-border-default bg-bg-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "29%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead className="bg-[linear-gradient(180deg,rgba(241,245,249,0.92),rgba(248,250,252,0.72))]">
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <th className="px-4 py-3.5" scope="col">
                        Ngày
                      </th>
                      <th className="px-4 py-3.5" scope="col">
                        Bài giáo án
                      </th>
                      <th className="px-4 py-3.5" scope="col">
                        Công việc
                      </th>
                      <th className="px-4 py-3.5" scope="col">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3.5" scope="col">
                        Contest / Link
                      </th>
                      <th className="px-4 py-3.5 text-right" scope="col">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.map((output, index) => {
                      const detailHref = buildOutputHref(
                        output.id,
                        workPage,
                        workYear,
                        workMonth,
                      );
                      const linkUrl = resolvePrimaryLink(output);
                      const linkLabel = linkUrl.replace(/^https?:\/\//, "");
                      const taskLabel = output.task?.title?.trim() || "Bài độc lập";
                      const staffLabel = output.staffDisplayName?.trim() || "Chưa gán";
                      const contestLabel =
                        output.contestUploaded?.trim() || "Chưa ghi cuộc thi / bộ đề";
                      const visibleTags = output.tags.slice(0, 3);
                      const extraTagCount = output.tags.length - visibleTags.length;

                      return (
                        <tr
                          key={output.id}
                          tabIndex={0}
                          role="link"
                          aria-label={`Mở chỉnh sửa ${output.lessonName}`}
                          onClick={() => router.push(detailHref)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(detailHref);
                            }
                          }}
                          className={`group cursor-pointer border-t border-border-default/80 align-top transition-all duration-150 hover:bg-bg-secondary/28 focus-visible:bg-primary/6 focus-visible:outline-none ${index % 2 === 0
                            ? "bg-white/92"
                            : "bg-[rgba(248,250,252,0.78)]"
                            }`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <span className="inline-flex w-fit rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                                {formatLessonDateOnly(output.date)}
                              </span>
                              <p className="text-xs leading-5 text-text-muted">
                                Cập nhật {formatLessonDateTime(output.updatedAt)}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <p className="line-clamp-3 break-words text-base font-semibold leading-6 text-text-primary transition-colors group-hover:text-primary group-focus-within:text-primary">
                                {output.lessonName}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <LevelPill level={output.level} />
                                {visibleTags.length > 0 ? (
                                  visibleTags.map((tag) => (
                                    <span
                                      key={`${output.id}-${tag}`}
                                      className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary"
                                    >
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  <span className="rounded-full border border-dashed border-border-default px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                                    Không tag
                                  </span>
                                )}
                                {extraTagCount > 0 ? (
                                  <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-muted">
                                    +{extraTagCount}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium leading-6 text-text-primary">
                                {taskLabel}
                              </p>
                              <p className="mt-2 break-words text-sm leading-6 text-text-secondary">
                                {staffLabel}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex min-w-0 flex-col gap-2">
                              <OutputStatusPill status={output.status} />
                              <PaymentPill cost={output.cost} />
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <p className="line-clamp-3 break-words text-sm leading-6 text-text-primary">
                                {contestLabel}
                              </p>
                              <p className="mt-2 break-all text-xs leading-5 text-text-muted">
                                {linkUrl ? linkLabel : "Chưa có liên kết công khai"}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div
                              className="flex flex-wrap justify-end gap-2 opacity-0 invisible transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                            >
                              <WorkActionButton
                                label="Sửa bài giáo án"
                                onClick={() => router.push(detailHref)}
                                icon={
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
                                }
                              />
                              <WorkActionButton
                                label="Xóa bài giáo án"
                                tone="danger"
                                disabled={deleteMutation.isPending}
                                onClick={() => confirmDelete(output)}
                                icon={
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
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/35 px-5 py-12 text-center">
              <p className="text-base font-semibold text-text-primary">
                Chưa có bài giáo án trong tháng này.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Thử đổi tháng hoặc tạo sản phẩm từ tab Tổng quan / chi tiết công việc.
              </p>
            </div>
          )}

          {outputs.length > 0 ? (
            <div className="mt-6">
              <WorkPagination
                page={data.outputsMeta.page}
                totalPages={data.outputsMeta.totalPages}
                total={data.outputsMeta.total}
                isPending={isFetching && data.outputsMeta.page !== workPage}
                onPageChange={handlePageChange}
              />
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
