"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { LessonWorkOutputItem, LessonWorkResponse } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import LessonWorkQuickFilters, {
  type LessonWorkFilterDraft,
} from "./LessonWorkQuickFilters";

const EX_PAGE_SIZE = 15;

const LEVEL_OPTIONS: { key: "all" | "0" | "1" | "2" | "3" | "4" | "5"; label: string }[] =
  [
    { key: "all", label: "Tất cả" },
    { key: "0", label: "Level 0" },
    { key: "1", label: "Level 1" },
    { key: "2", label: "Level 2" },
    { key: "3", label: "Level 3" },
    { key: "4", label: "Level 4" },
    { key: "5", label: "Level 5" },
  ];

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeExLevel(
  raw: string | null,
): "all" | "0" | "1" | "2" | "3" | "4" | "5" {
  if (
    raw === "0" ||
    raw === "1" ||
    raw === "2" ||
    raw === "3" ||
    raw === "4" ||
    raw === "5"
  ) {
    return raw;
  }
  return "all";
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function buildOutputHref(outputId: string, base: URLSearchParams) {
  const params = new URLSearchParams(base.toString());
  params.set("tab", "exercises");
  return `/admin/lesson-plans/outputs/${encodeURIComponent(outputId)}?${params.toString()}`;
}

function resolvePrimaryLink(output: LessonWorkOutputItem) {
  return output.link?.trim() || output.originalLink?.trim() || "";
}

function formatTagsLine(output: LessonWorkOutputItem) {
  if (output.tags.length === 0) {
    return "—";
  }
  return output.tags.join(", ");
}

function ExPagination({
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
          {total} bài
          {total > 0 ? (
            <>
              {" "}
              (trang {page}/{totalPages})
            </>
          ) : null}
        </p>
        {isPending ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Đang tải
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
          {page}/{Math.max(1, totalPages)}
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

/**
 * Tab **Bài tập** — danh sách bài đã làm (lesson outputs), lọc level + bộ lọc nhanh,
 * đồng bộ backup UI (sidebar level, bảng Tag · Tên bài · Link).
 */
export default function LessonExercisesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const exPage = normalizePositiveInt(searchParams.get("exPage"));
  const exLevel = normalizeExLevel(searchParams.get("exLevel"));

  const exSearch = searchParams.get("exSearch") ?? "";
  const exTag = searchParams.get("exTag") ?? "";
  const exOutputStatus = searchParams.get("exOutputStatus") ?? "all";
  const exStaffId = searchParams.get("exStaffId") ?? "";
  const exDateFrom = searchParams.get("exDateFrom") ?? "";
  const exDateTo = searchParams.get("exDateTo") ?? "";

  const [filterOpen, setFilterOpen] = useState(true);
  const appliedDraft = useMemo<LessonWorkFilterDraft>(
    () => ({
      search: exSearch,
      tag: exTag,
      outputStatus: exOutputStatus || "all",
      staffId: exStaffId,
      dateFrom: exDateFrom,
      dateTo: exDateTo,
    }),
    [exDateFrom, exDateTo, exOutputStatus, exSearch, exStaffId, exTag],
  );
  const filterDraftKey = useMemo(
    () => JSON.stringify(appliedDraft),
    [appliedDraft],
  );

  const { data: staffFilterOptions = [] } = useQuery({
    queryKey: ["lesson", "output-staff-options", "exercises-filter"],
    queryFn: () =>
      lessonApi.searchLessonOutputStaffOptions({
        limit: 80,
      }),
  });

  const syncExParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "exercises");
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
    syncExParams({
      exSearch: draft.search.trim() || null,
      exTag: draft.tag.trim() || null,
      exOutputStatus:
        draft.outputStatus === "all" || !draft.outputStatus.trim()
          ? null
          : draft.outputStatus.trim(),
      exStaffId: draft.staffId.trim() || null,
      exDateFrom: draft.dateFrom.trim() || null,
      exDateTo: draft.dateTo.trim() || null,
      exPage: 1,
    });
  }, [syncExParams]);

  const clearFilters = useCallback(() => {
    syncExParams({
      exSearch: null,
      exTag: null,
      exOutputStatus: null,
      exStaffId: null,
      exDateFrom: null,
      exDateTo: null,
      exPage: 1,
    });
  }, [syncExParams]);

  const setLevel = (level: "all" | "0" | "1" | "2" | "3" | "4" | "5") => {
    syncExParams({
      exLevel: level === "all" ? null : level,
      exPage: 1,
    });
  };

  const handlePageChange = (page: number) => {
    syncExParams({ exPage: page });
  };

  const goToWorkTabToAddLesson = () => {
    router.push("/admin/lesson-plans?tab=work");
  };

  const queryKey = useMemo(
    () =>
      [
        "lesson",
        "exercises",
        exPage,
        exLevel,
        exSearch,
        exTag,
        exOutputStatus,
        exStaffId,
        exDateFrom,
        exDateTo,
      ] as const,
    [
      exPage,
      exLevel,
      exSearch,
      exTag,
      exOutputStatus,
      exStaffId,
      exDateFrom,
      exDateTo,
    ],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useQuery<LessonWorkResponse>({
      queryKey,
      queryFn: () =>
        lessonApi.getLessonWork({
          page: exPage,
          limit: EX_PAGE_SIZE,
          search: exSearch || undefined,
          tag: exTag || undefined,
          outputStatus:
            exOutputStatus && exOutputStatus !== "all"
              ? exOutputStatus
              : undefined,
          staffId: exStaffId || undefined,
          dateFrom: exDateFrom || undefined,
          dateTo: exDateTo || undefined,
          level: exLevel === "all" ? undefined : exLevel,
        }),
      placeholderData: (previousData) => previousData,
    });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lessonApi.deleteLessonOutput(id),
    onSuccess: () => {
      toast.success("Đã xóa bài giáo án.");
      void queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", "work"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không xóa được bản ghi."));
    },
  });

  const baseParams = useMemo(
    () => new URLSearchParams(searchParams?.toString() ?? ""),
    [searchParams],
  );

  const copyText = async (text: string, label: string) => {
    if (!text.trim()) {
      toast.error("Không có nội dung để sao chép.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      toast.error("Không sao chép được.");
    }
  };

  const openExternal = (url: string) => {
    const u = url.trim();
    if (!u) {
      toast.error("Chưa có liên kết.");
      return;
    }
    try {
      const href = u.startsWith("http") ? u : `https://${u}`;
      window.open(href, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Không mở được liên kết.");
    }
  };

  const confirmDelete = (output: LessonWorkOutputItem) => {
    const ok = window.confirm(
      `Xóa bài “${output.lessonName.trim() || output.id}”? Hành động không hoàn tác.`,
    );
    if (!ok) {
      return;
    }
    deleteMutation.mutate(output.id);
  };

  const outputs = data?.outputs ?? [];
  const total = data?.outputsMeta.total ?? 0;

  if (isLoading && !data) {
    return (
      <section
        id="lesson-panel-exercises"
        role="tabpanel"
        aria-labelledby="lesson-tab-exercises"
        className="space-y-4"
      >
        <div className="h-40 animate-pulse rounded-xl border border-border-default bg-bg-secondary/50" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section
        id="lesson-panel-exercises"
        role="tabpanel"
        aria-labelledby="lesson-tab-exercises"
        className="space-y-6"
      >
        <section className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
          <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
            <p className="text-base font-semibold text-text-primary">
              Không tải được danh sách bài tập.
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {getErrorMessage(error, "Đã có lỗi khi tải tab Bài tập.")}
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
      id="lesson-panel-exercises"
      role="tabpanel"
      aria-labelledby="lesson-tab-exercises"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <aside className="shrink-0 lg:w-52">
          <nav
            className="rounded-xl border border-border-default bg-bg-surface p-2 shadow-sm"
            aria-label="Lọc theo level"
          >
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Level
            </p>
            <ul className="flex flex-row gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-col lg:overflow-x-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
              {LEVEL_OPTIONS.map((opt) => {
                const active =
                  opt.key === "all"
                    ? exLevel === "all"
                    : exLevel === opt.key;
                return (
                  <li key={opt.key} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      onClick={() => setLevel(opt.key)}
                      className={`w-full min-h-10 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                        active
                          ? "bg-primary text-text-inverse"
                          : "text-text-primary hover:bg-bg-secondary/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <LessonWorkQuickFilters
            key={filterDraftKey}
            open={filterOpen}
            onOpenChange={setFilterOpen}
            initialDraft={appliedDraft}
            onApply={applyFilters}
            onClear={clearFilters}
            staffOptions={staffFilterOptions}
            footerNote={
              <p className="text-xs leading-5 text-text-muted">
                Mặc định xem <strong>toàn bộ thời gian</strong> (không gắn tháng).
                Đặt <strong>Từ ngày</strong> / <strong>Đến ngày</strong> để giới hạn
                khoảng; kết hợp với ô tìm kiếm và lọc level bên trái.
              </p>
            }
          />

          <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 border-b border-border-default pb-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-text-primary sm:text-xl">
                Các bài đã làm ({total})
              </h3>
              <button
                type="button"
                onClick={goToWorkTabToAddLesson}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Thêm bài mới — mở tab Công việc"
                title="Thêm bài mới (tab Công việc)"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-4 max-h-[min(32rem,70vh)] overflow-y-auto">
              {outputs.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border-default">
                  <div className="overflow-x-auto">
                    <table className="min-w-[40rem] border-collapse text-left">
                      <thead className="sticky top-0 z-[1] bg-bg-secondary">
                        <tr className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          <th className="min-w-[12rem] px-3 py-3" scope="col">
                            Tag
                          </th>
                          <th className="min-w-[16rem] px-3 py-3" scope="col">
                            Tên bài
                          </th>
                          <th className="w-28 px-3 py-3 text-right" scope="col">
                            Link
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {outputs.map((output) => {
                          const detailHref = buildOutputHref(
                            output.id,
                            baseParams,
                          );
                          const linkUrl = resolvePrimaryLink(output);

                          return (
                            <tr
                              key={output.id}
                              className="cursor-pointer border-t border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary/40"
                              onClick={() => router.push(detailHref)}
                            >
                              <td className="px-3 py-3 align-top text-sm text-text-secondary">
                                <span className="line-clamp-3">
                                  {formatTagsLine(output)}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <Link
                                  href={detailHref}
                                  className="inline-flex items-start gap-2 text-sm font-semibold leading-snug text-text-primary underline-offset-4 transition-colors hover:text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                  aria-label={`Mở chi tiết ${output.lessonName}`}
                                >
                                  <span className="line-clamp-4">
                                    {output.lessonName}
                                  </span>
                                  <svg
                                    className="mt-0.5 size-4 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </Link>
                              </td>
                              <td
                                className="px-3 py-3 align-top text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-0.5">
                                  <button
                                    type="button"
                                    title="Sao chép liên kết"
                                    disabled={!linkUrl}
                                    onClick={() =>
                                      void copyText(linkUrl, "liên kết")
                                    }
                                    className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
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
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    title="Mở liên kết"
                                    disabled={!linkUrl}
                                    onClick={() => openExternal(linkUrl)}
                                    className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
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
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    title="Xóa"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => confirmDelete(output)}
                                    className="rounded-lg p-2 text-text-muted transition-colors hover:bg-error/15 hover:text-error disabled:opacity-50"
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
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
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
                <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/35 px-5 py-12 text-center">
                  <p className="text-base font-semibold text-text-primary">
                    Chưa có bài phù hợp bộ lọc.
                  </p>
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                    Thử đổi level, xóa lọc hoặc thêm bài ở tab Công việc (nút +).
                  </p>
                </div>
              )}
            </div>

            {outputs.length > 0 ? (
              <div className="mt-6">
                <ExPagination
                  page={data.outputsMeta.page}
                  totalPages={data.outputsMeta.totalPages}
                  total={data.outputsMeta.total}
                  isPending={
                    isFetching && data.outputsMeta.page !== exPage
                  }
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
