"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import * as surveysApi from "@/lib/apis/surveys.api";
import type {
  MissingSurveyClassList,
  SurveyRoundSummary,
} from "@/dtos/survey-round.dto";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const SURVEY_ROUND_QUERY_KEY = ["surveys", "round-summary"] as const;
const MISSING_CLASSES_QUERY_KEY = ["surveys", "missing-classes"] as const;

function normalizePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildUrl(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

export default function AdminSurveysPage() {
  const pathname = usePathname();
  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const page = normalizePage(searchParams?.get("page") ?? null);
  const [roundDraft, setRoundDraft] = useState<string>("");

  const summaryQuery = useQuery<SurveyRoundSummary>({
    queryKey: SURVEY_ROUND_QUERY_KEY,
    queryFn: surveysApi.getSurveyRoundSummary,
  });

  const missingQuery = useQuery<MissingSurveyClassList>({
    queryKey: [...MISSING_CLASSES_QUERY_KEY, page, PAGE_SIZE],
    queryFn: () =>
      surveysApi.getMissingSurveyClasses({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SURVEY_ROUND_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: MISSING_CLASSES_QUERY_KEY }),
    ]);
  };

  const setRoundMutation = useMutation({
    mutationFn: (next: number) => surveysApi.setSurveyRound({ number: next }),
    onSuccess: async (result) => {
      toast.success(`Đã đặt lần khảo sát hiện tại là ${result.currentRound}.`);
      setRoundDraft("");
      await invalidateAll();
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật lần khảo sát."));
    },
  });

  const summary = summaryQuery.data;
  const missing = missingQuery.data;
  const list = missing?.data ?? [];
  const total = missing?.meta.total ?? 0;
  const currentPage = missing?.meta.page ?? page;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isMutating = setRoundMutation.isPending;

  const setPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(Math.min(totalPages, Math.max(1, nextPage))));
    replace(buildUrl(pathname, params));
  };

  const handleSaveRound = () => {
    const next = Number(roundDraft);
    if (!Number.isInteger(next) || next < 1) {
      toast.error("Lần khảo sát phải là số nguyên lớn hơn 0.");
      return;
    }
    if (summary && next === summary.currentRound) {
      toast.info("Lần khảo sát không thay đổi.");
      return;
    }
    setRoundMutation.mutate(next);
  };

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="border-b border-border-default pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            Khảo sát
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Quản lý lần khảo sát
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Đặt lần khảo sát hiện tại cho toàn hệ thống và theo dõi các lớp đang
            chạy chưa nộp báo cáo khảo sát của lần đó.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryStat
              label="Lần hiện tại"
              value={summary ? `Lần ${summary.currentRound}` : "—"}
              loading={summaryQuery.isLoading}
              emphasis
            />
            <SummaryStat
              label="Lớp đang chạy"
              value={summary ? String(summary.totalRunningClasses) : "—"}
              loading={summaryQuery.isLoading}
            />
            <SummaryStat
              label="Đã báo cáo"
              value={summary ? String(summary.reportedCount) : "—"}
              loading={summaryQuery.isLoading}
              tone="success"
            />
            <SummaryStat
              label="Chưa báo cáo"
              value={summary ? String(summary.missingCount) : "—"}
              loading={summaryQuery.isLoading}
              tone="warning"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4">
            <p className="text-sm font-semibold text-text-primary">
              Đặt lần khảo sát
            </p>
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-text-muted">
                  Số lần khảo sát
                </span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={roundDraft}
                  onChange={(event) => setRoundDraft(event.target.value)}
                  placeholder={
                    summary ? String(summary.currentRound) : "Nhập số"
                  }
                  className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveRound}
                disabled={!summary || isMutating || roundDraft.trim() === ""}
                className="rounded-md border border-border-default px-3 py-2 text-sm font-semibold text-text-secondary transition hover:border-primary/50 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {setRoundMutation.isPending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Đặt số lần khảo sát hiện tại cho toàn hệ thống.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">
                Lớp chưa báo cáo
                {summary ? ` lần ${summary.currentRound}` : ""}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Trang {currentPage}/{totalPages} · Tổng {total} lớp
              </p>
            </div>
            {missingQuery.isFetching ? (
              <span className="text-xs font-medium text-text-muted">
                Đang tải…
              </span>
            ) : null}
          </div>

          {missingQuery.isError ? (
            <div className="px-4 py-8 text-sm text-error">
              {getErrorMessage(
                missingQuery.error,
                "Không thể tải danh sách lớp.",
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {missingQuery.isLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-28 animate-pulse rounded-lg border border-border-default bg-bg-secondary"
                      />
                    ))
                  : list.map((item) => (
                      <Link
                        key={item.classId}
                        href={`/admin/classes/${item.classId}`}
                        prefetch={false}
                        className="block rounded-lg border border-border-default bg-bg-surface p-4 transition hover:border-primary/50"
                      >
                        <p className="text-sm font-semibold text-text-primary">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          {item.teachers.length > 0
                            ? item.teachers.join(", ")
                            : "Chưa phân công gia sư"}
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                          <div>
                            <dt className="text-text-muted">Lần gần nhất</dt>
                            <dd className="mt-0.5">
                              {item.latestReportedRound != null
                                ? `Lần ${item.latestReportedRound}`
                                : "Chưa có"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-text-muted">Ngày báo cáo</dt>
                            <dd className="mt-0.5">
                              {formatDate(item.lastReportDate)}
                            </dd>
                          </div>
                        </dl>
                      </Link>
                    ))}
                {!missingQuery.isLoading && list.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border-default px-4 py-10 text-center text-sm text-text-muted">
                    Tất cả lớp đang chạy đều đã báo cáo lần này.
                  </div>
                ) : null}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-border-default text-sm">
                  <thead className="bg-bg-secondary/70 text-left text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Lớp</th>
                      <th className="px-4 py-3">Gia sư phụ trách</th>
                      <th className="px-4 py-3">Lần gần nhất</th>
                      <th className="px-4 py-3">Ngày báo cáo gần nhất</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {missingQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <tr key={index} className="animate-pulse">
                            <td className="px-4 py-4" colSpan={5}>
                              <div className="h-4 rounded bg-bg-secondary" />
                            </td>
                          </tr>
                        ))
                      : list.map((item) => (
                          <tr
                            key={item.classId}
                            className="align-top hover:bg-bg-secondary/50"
                          >
                            <td className="px-4 py-4 font-semibold text-text-primary">
                              {item.name}
                            </td>
                            <td className="px-4 py-4 text-text-secondary">
                              {item.teachers.length > 0
                                ? item.teachers.join(", ")
                                : "Chưa phân công"}
                            </td>
                            <td className="px-4 py-4 text-text-secondary">
                              {item.latestReportedRound != null
                                ? `Lần ${item.latestReportedRound}`
                                : "Chưa có"}
                            </td>
                            <td className="px-4 py-4 text-text-secondary">
                              {formatDate(item.lastReportDate)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <Link
                                href={`/admin/classes/${item.classId}`}
                                prefetch={false}
                                className="inline-flex rounded-md border border-border-default px-3 py-2 text-xs font-semibold text-primary transition hover:bg-bg-secondary"
                              >
                                Mở lớp
                              </Link>
                            </td>
                          </tr>
                        ))}
                    {!missingQuery.isLoading && list.length === 0 ? (
                      <tr>
                        <td
                          className="px-4 py-10 text-center text-sm text-text-muted"
                          colSpan={5}
                        >
                          Tất cả lớp đang chạy đều đã báo cáo lần này.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-muted">Tổng {total} lớp</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-md border border-border-default px-3 py-2 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-border-default px-3 py-2 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  loading,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: string;
  loading?: boolean;
  tone?: "default" | "success" | "warning";
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-bg-surface p-4",
        emphasis ? "border-primary/40" : "border-border-default",
      )}
    >
      <p className="text-xs font-medium text-text-muted">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded bg-bg-secondary" />
      ) : (
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "default" && "text-text-primary",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}
