"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import type {
  ActionHistoryActionType,
  ActionHistoryChangedFields,
  ActionHistoryDetail,
  ActionHistoryListItem,
} from "@/dtos/action-history.dto";
import * as actionHistoryApi from "@/lib/apis/action-history.api";

const PAGE_SIZE = 20;
const EMPTY_HISTORY_ENTRIES: ActionHistoryListItem[] = [];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTION_LABELS: Record<ActionHistoryActionType, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Người dùng",
  student: "Học sinh",
  staff: "Nhân sự",
  class: "Lớp học",
  session: "Buổi học",
  cost: "Khoản chi",
  bonus: "Khoản thưởng",
  extra_allowance: "Trợ cấp thêm",
  cf_problem_tutorial: "Tutorial CF",
};

const ENTITY_OPTIONS = [
  { value: "all", label: "Tất cả đối tượng" },
  { value: "session", label: "Buổi học" },
  { value: "class", label: "Lớp học" },
  { value: "student", label: "Học sinh" },
  { value: "staff", label: "Nhân sự" },
  { value: "user", label: "Người dùng" },
  { value: "cost", label: "Khoản chi" },
  { value: "bonus", label: "Khoản thưởng" },
  { value: "extra_allowance", label: "Trợ cấp thêm" },
  { value: "cf_problem_tutorial", label: "Tutorial CF" },
];

const ACTION_OPTIONS = [
  { value: "all", label: "Mọi thao tác" },
  { value: "create", label: "Tạo mới" },
  { value: "update", label: "Cập nhật" },
  { value: "delete", label: "Xóa" },
];

interface HistoryFilterDraft {
  entityType: string;
  actionType: string;
  entityId: string;
  startDate: string;
  endDate: string;
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return formatDateInput(date);
}

function getDefaultEndDate() {
  return formatDateInput(new Date());
}

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_PATTERN.test(value);
}

function normalizeDateParam(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function normalizeSelectValue(value: string | null) {
  return value?.trim() ? value : "all";
}

function getEntityLabel(entityType: string | null | undefined) {
  if (!entityType) {
    return "Đối tượng khác";
  }

  return ENTITY_LABELS[entityType] ?? entityType.replaceAll("_", " ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      short: value,
      date: value,
      time: "",
    };
  }

  return {
    short: new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date),
    date: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function formatDateLabel(value: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) {
    return value;
  }

  return `${matched[3]}/${matched[2]}`;
}

function formatMetricNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function shortenMiddle(value: string, start = 8, end = 4) {
  if (value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function getActionFilterLabel(actionType: string | null | undefined) {
  if (!actionType || actionType === "all") {
    return "Mọi thao tác";
  }

  return ACTION_LABELS[actionType as ActionHistoryActionType] ?? actionType;
}

function getFilterSummaryChips(draft: HistoryFilterDraft) {
  const chips = [`${formatDateLabel(draft.startDate)} - ${formatDateLabel(draft.endDate)}`];

  if (draft.entityType !== "all") {
    chips.unshift(getEntityLabel(draft.entityType));
  }

  if (draft.actionType !== "all") {
    chips.push(getActionFilterLabel(draft.actionType));
  }

  if (draft.entityId.trim()) {
    chips.push(`ID ${shortenMiddle(draft.entityId.trim(), 6, 4)}`);
  }

  return chips;
}

function countNarrowedFilters(
  draft: HistoryFilterDraft,
  defaults: Pick<HistoryFilterDraft, "startDate" | "endDate">,
) {
  return (
    Number(draft.entityType !== "all") +
    Number(draft.actionType !== "all") +
    Number(Boolean(draft.entityId.trim())) +
    Number(draft.startDate !== defaults.startDate || draft.endDate !== defaults.endDate)
  );
}

function formatValuePreview(value: unknown) {
  if (value == null) {
    return "null";
  }

  if (typeof value === "string") {
    const compact = value.trim();
    if (!compact) {
      return '""';
    }

    return compact.length > 60 ? `${compact.slice(0, 57)}…` : compact;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length > 0 ? `{ ${keys.slice(0, 3).join(", ")} }` : "{}";
  }

  return String(value);
}

function formatJsonBlock(value: unknown) {
  if (value == null) {
    return "null";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getChangedFieldEntries(changedFields: ActionHistoryChangedFields | null | undefined) {
  return Object.entries(changedFields ?? {});
}

function extractEntityNameFromSnapshot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = [
    "fullName",
    "name",
    "email",
    "accountHandle",
    "title",
    "category",
    "workType",
  ];

  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function getEntryTitle(item: ActionHistoryListItem, detail?: ActionHistoryDetail) {
  const entityLabel = getEntityLabel(item.entityType);
  const entityName =
    item.entityDisplayName?.trim() ||
    extractEntityNameFromSnapshot(detail?.afterValue) ||
    extractEntityNameFromSnapshot(detail?.beforeValue);

  if (entityName) {
    return `${entityLabel}: ${entityName}`;
  }

  if (item.entityId) {
    return `${entityLabel}: ${item.entityId}`;
  }

  return entityLabel;
}

function getActionTone(actionType: ActionHistoryActionType | null | undefined) {
  if (actionType === "create") {
    return {
      marker: "bg-success",
      badge: "border-success/25 bg-success/12 text-success",
      summary: "text-success",
      previewFrom: "text-text-muted",
      previewTo: "text-success",
    };
  }

  if (actionType === "delete") {
    return {
      marker: "bg-error",
      badge: "border-error/25 bg-error/12 text-error",
      summary: "text-error",
      previewFrom: "text-text-muted",
      previewTo: "text-error",
    };
  }

  return {
    marker: "bg-primary",
    badge: "border-primary/25 bg-primary/12 text-primary",
    summary: "text-primary",
    previewFrom: "text-text-muted",
    previewTo: "text-primary",
  };
}

function OverviewStatCard({
  eyebrow,
  value,
  caption,
  accent = false,
}: {
  eyebrow: string;
  value: string;
  caption: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 backdrop-blur-sm ${
        accent
          ? "border-primary/20 bg-primary/10"
          : "border-border-default bg-bg-surface/85"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
        {eyebrow}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-text-primary sm:text-xl">
        {value}
      </p>
      <p className="mt-1 text-sm leading-6 text-text-secondary">{caption}</p>
    </div>
  );
}

function TimelineMetaTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-secondary/45 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-medium text-text-secondary ${
          mono ? "break-all font-mono text-[13px] leading-5" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function HistoryTimelineSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="relative pl-7 sm:pl-9">
          <div className="absolute left-0.5 top-5 size-4 rounded-full border-2 border-bg-surface bg-bg-tertiary sm:size-5 sm:border-4" />
          {index < 4 ? (
            <div className="absolute left-[8px] top-9 h-[calc(100%+1rem)] w-px bg-border-default sm:left-[10px]" />
          ) : null}
          <div className="h-52 animate-pulse rounded-[26px] border border-border-default bg-bg-secondary/70" />
        </div>
      ))}
    </div>
  );
}

function TimelineItem({
  item,
  isLast,
  isExpanded,
  onToggle,
}: {
  item: ActionHistoryListItem;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const tone = getActionTone(item.actionType);
  const changedFieldEntries = getChangedFieldEntries(item.changedFields);
  const dateTime = formatDateTime(item.createdAt);
  const detailQuery = useQuery({
    queryKey: ["action-history", "detail", item.id],
    queryFn: () => actionHistoryApi.getActionHistoryById(item.id),
    enabled: isExpanded,
    staleTime: 30_000,
  });
  const detailErrorMessage =
    (detailQuery.error as { response?: { data?: { message?: string } } })?.response
      ?.data?.message ??
    (detailQuery.error as Error | undefined)?.message ??
    "Không tải được chi tiết bản ghi lịch sử.";
  const entryTitle = getEntryTitle(item, detailQuery.data);

  return (
    <li className="relative pl-7 sm:pl-9">
      <div
        className={`absolute left-0.5 top-5 z-10 size-4 rounded-full border-2 border-bg-surface sm:size-5 sm:border-4 ${tone.marker}`}
      />
      {!isLast ? (
        <div className="absolute left-[8px] top-9 h-[calc(100%+1rem)] w-px bg-border-default sm:left-[10px]" />
      ) : null}

      <article
        className={`overflow-hidden rounded-[26px] border bg-bg-surface shadow-sm transition-[border-color,box-shadow,transform] duration-200 motion-hover-lift ${
          isExpanded
            ? "border-border-focus ring-1 ring-primary/10"
            : "border-border-default hover:border-border-focus/70"
        }`}
      >
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="touch-manipulation w-full rounded-[26px] px-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:px-5 sm:py-5"
          aria-expanded={isExpanded}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
                  >
                    {item.actionType ? ACTION_LABELS[item.actionType] : "Cập nhật"}
                  </span>
                  <span className="rounded-full border border-border-default bg-bg-secondary/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    {getEntityLabel(item.entityType)}
                  </span>
                  <span className="rounded-full border border-border-default bg-bg-secondary/65 px-3 py-1 text-xs font-medium text-text-secondary">
                    {changedFieldEntries.length} trường
                  </span>
                </div>

                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                  {dateTime.short}
                </p>

                <h2 className="mt-2 break-words text-base font-semibold leading-7 text-text-primary sm:text-lg">
                  {entryTitle}
                </h2>
              </div>

              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted">
                <svg
                  className={`size-4 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>

            <p className="break-words text-sm leading-7 text-text-secondary">
              {item.description?.trim() || "Không có mô tả thao tác."}
            </p>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <TimelineMetaTile label="Người thực hiện" value={item.userEmail || "Không xác định"} />
              <TimelineMetaTile label="Entity ID" value={item.entityId || "—"} mono />
              <TimelineMetaTile label="Mốc ghi log" value={`${dateTime.date} ${dateTime.time}`.trim()} />
            </div>
          </div>
        </button>

        {isExpanded ? (
          <div className="border-t border-border-default bg-bg-secondary/20 px-4 py-4 sm:px-5">
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Nội dung mở rộng
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Card mở trực tiếp trong timeline, không ghi state expand vào URL.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                  Inline expand
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-border-default bg-bg-surface p-3.5 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`text-sm font-medium ${tone.summary}`}>Trường đã thay đổi</p>
                  <span className="inline-flex rounded-full border border-border-default bg-bg-secondary/45 px-3 py-1 text-xs font-medium text-text-secondary">
                    {changedFieldEntries.length} mục
                  </span>
                </div>

                {changedFieldEntries.length > 0 ? (
                  <div className="mt-3 space-y-2.5">
                    {changedFieldEntries.map(([field, change]) => (
                      <div
                        key={field}
                        className="rounded-2xl border border-border-default bg-bg-secondary/25 px-3.5 py-3.5"
                      >
                        <p className="text-sm font-semibold text-text-primary">{field}</p>

                        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
                          <div className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                              Trước
                            </p>
                            <p className={`mt-2 break-words text-xs leading-6 ${tone.previewFrom}`}>
                              {formatValuePreview(change.old)}
                            </p>
                          </div>

                          <div className="hidden items-center justify-center text-text-muted md:flex">
                            <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs">
                              →
                            </span>
                          </div>

                          <div className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                              Sau
                            </p>
                            <p
                              className={`mt-2 break-words text-xs font-medium leading-6 ${tone.previewTo}`}
                            >
                              {formatValuePreview(change.new)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-text-muted">
                    Bản ghi này không có diff field-level để hiển thị.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Snapshot chi tiết
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Dữ liệu trước và sau chỉ được tải khi mở bản ghi này.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                  Lazy detail
                </span>
              </div>

              {detailQuery.isLoading ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="h-52 animate-pulse rounded-2xl border border-border-default bg-bg-secondary" />
                  <div className="h-52 animate-pulse rounded-2xl border border-border-default bg-bg-secondary" />
                </div>
              ) : detailQuery.isError ? (
                <div className="rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                  {detailErrorMessage}
                </div>
              ) : detailQuery.data ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  <section className="rounded-2xl border border-border-default bg-bg-surface p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Trước khi thay đổi
                      </h3>
                      <span className="rounded-full border border-border-default bg-bg-secondary/55 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                        Before
                      </span>
                    </div>
                    <pre className="mt-3 max-h-80 overflow-auto overscroll-contain rounded-2xl border border-border-default bg-bg-secondary/45 p-3 text-[11px] leading-6 text-text-secondary">
                      {formatJsonBlock(detailQuery.data.beforeValue)}
                    </pre>
                  </section>

                  <section className="rounded-2xl border border-border-default bg-bg-surface p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                        Sau khi thay đổi
                      </h3>
                      <span className="rounded-full border border-border-default bg-bg-secondary/55 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                        After
                      </span>
                    </div>
                    <pre className="mt-3 max-h-80 overflow-auto overscroll-contain rounded-2xl border border-border-default bg-bg-secondary/45 p-3 text-[11px] leading-6 text-text-primary">
                      {formatJsonBlock(detailQuery.data.afterValue)}
                    </pre>
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </article>
    </li>
  );
}

function HistoryFilterCard({
  initialDraft,
  summaryChips,
  narrowedFilterCount,
  onApply,
  onReset,
}: {
  initialDraft: HistoryFilterDraft;
  summaryChips: string[];
  narrowedFilterCount: number;
  onApply: (draft: HistoryFilterDraft) => void;
  onReset: () => void;
}) {
  const [entityType, setEntityType] = useState(initialDraft.entityType);
  const [actionType, setActionType] = useState(initialDraft.actionType);
  const [entityId, setEntityId] = useState(initialDraft.entityId);
  const [startDate, setStartDate] = useState(initialDraft.startDate);
  const [endDate, setEndDate] = useState(initialDraft.endDate);

  const isEntityIdValid = entityId.trim() === "" || isUuid(entityId.trim());
  const isDateRangeValid = startDate <= endDate;
  const canApplyFilters = isEntityIdValid && isDateRangeValid;

  return (
    <section className="overflow-hidden rounded-[28px] border border-border-default bg-bg-surface shadow-sm motion-fade-up">
      <div
        className="border-b border-border-default px-4 py-4 sm:px-5"
        style={{
          backgroundImage:
            "linear-gradient(135deg, color-mix(in srgb, var(--ue-primary) 8%, transparent), transparent 48%), linear-gradient(180deg, color-mix(in srgb, var(--ue-bg-secondary) 74%, transparent), var(--ue-bg-surface))",
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Query Deck
            </p>
            <h2 className="mt-2 text-base font-semibold text-text-primary sm:text-lg">
              Bộ lọc timeline
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Giữ đúng query path backend hiện tại: lọc theo loại đối tượng, thao tác, khoảng ngày
              và exact `entityId`.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border-default bg-bg-surface/85 px-3 py-1.5 text-xs font-medium text-text-secondary">
              {narrowedFilterCount === 0
                ? "Đang xem rộng theo ngày"
                : `${narrowedFilterCount} tiêu chí đang thu hẹp`}
            </span>
            <span className="rounded-full border border-border-default bg-bg-surface/85 px-3 py-1.5 text-xs font-medium text-text-secondary">
              Exact UUID
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {summaryChips.map((chip) => (
            <span
              key={chip}
              className="whitespace-nowrap rounded-full border border-border-default bg-bg-surface/90 px-3 py-1.5 text-xs font-medium text-text-secondary"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block rounded-2xl border border-border-default bg-bg-secondary/35 p-3.5">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Loại đối tượng
            </span>
            <UpgradedSelect
              name="entityType"
              value={entityType}
              onValueChange={setEntityType}
              options={ENTITY_OPTIONS}
              ariaLabel="Chọn loại đối tượng"
              buttonClassName="min-h-12 w-full rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-text-primary shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus touch-manipulation"
              menuClassName="rounded-2xl border border-border-default bg-bg-surface p-1.5 shadow-2xl"
            />
          </label>

          <label className="block rounded-2xl border border-border-default bg-bg-secondary/35 p-3.5">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Loại hành động
            </span>
            <UpgradedSelect
              name="actionType"
              value={actionType}
              onValueChange={setActionType}
              options={ACTION_OPTIONS}
              ariaLabel="Chọn loại hành động"
              buttonClassName="min-h-12 w-full rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-text-primary shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus touch-manipulation"
              menuClassName="rounded-2xl border border-border-default bg-bg-surface p-1.5 shadow-2xl"
            />
          </label>

          <label className="block rounded-2xl border border-border-default bg-bg-secondary/35 p-3.5">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Từ ngày
            </span>
            <input
              type="date"
              name="startDate"
              autoComplete="off"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-invalid={!isDateRangeValid}
              className="min-h-12 w-full rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-border-focus focus:ring-2 focus:ring-border-focus"
            />
          </label>

          <label className="block rounded-2xl border border-border-default bg-bg-secondary/35 p-3.5">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Đến ngày
            </span>
            <input
              type="date"
              name="endDate"
              autoComplete="off"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-invalid={!isDateRangeValid}
              className="min-h-12 w-full rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-border-focus focus:ring-2 focus:ring-border-focus"
            />
          </label>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-end">
          <label className="block rounded-2xl border border-border-default bg-bg-secondary/35 p-3.5">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              Entity ID exact
            </span>
            <input
              type="text"
              name="entityId"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
              aria-invalid={!isEntityIdValid}
              placeholder="Dán UUID chính xác…"
              className={`min-h-12 w-full rounded-xl border bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 ${
                isEntityIdValid
                  ? "border-border-default focus:border-border-focus focus:ring-2 focus:ring-border-focus"
                  : "border-error focus:border-error focus:ring-2 focus:ring-error"
              }`}
            />

            {!isEntityIdValid ? (
              <span className="mt-2 block text-xs text-error">Entity ID cần là UUID hợp lệ.</span>
            ) : !isDateRangeValid ? (
              <span className="mt-2 block text-xs text-error">
                Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.
              </span>
            ) : (
              <span className="mt-2 block text-xs leading-5 text-text-muted">
                Filter exact-match để bám đúng query path hiện tại.
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={() =>
              onApply({
                entityType,
                actionType,
                entityId,
                startDate,
                endDate,
              })
            }
            disabled={!canApplyFilters}
            className="min-h-12 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-text-inverse transition hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
          >
            Áp dụng
          </button>

          <button
            type="button"
            onClick={onReset}
            className="min-h-12 rounded-2xl border border-border-default bg-bg-surface px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus touch-manipulation"
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}

export default function AdminHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedEntryIds, setExpandedEntryIds] = useState<string[]>([]);
  const defaultStartDate = getDefaultStartDate();
  const defaultEndDate = getDefaultEndDate();

  const page = parsePage(searchParams.get("page"));
  const urlEntityType = normalizeSelectValue(searchParams.get("entityType"));
  const urlActionType = normalizeSelectValue(searchParams.get("actionType"));
  const urlEntityId = searchParams.get("entityId") ?? "";
  const urlStartDate = normalizeDateParam(searchParams.get("startDate"), defaultStartDate);
  const urlEndDate = normalizeDateParam(searchParams.get("endDate"), defaultEndDate);

  const replaceSearchParams = (params: URLSearchParams) => {
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const listQuery = useQuery({
    queryKey: [
      "action-history",
      "list",
      page,
      PAGE_SIZE,
      urlEntityType,
      urlActionType,
      urlEntityId,
      urlStartDate,
      urlEndDate,
    ],
    queryFn: () =>
      actionHistoryApi.getActionHistoryList({
        page,
        limit: PAGE_SIZE,
        entityType: urlEntityType !== "all" ? urlEntityType : undefined,
        actionType:
          urlActionType !== "all"
            ? (urlActionType as ActionHistoryActionType)
            : undefined,
        entityId: urlEntityId.trim() || undefined,
        startDate: urlStartDate,
        endDate: urlEndDate,
      }),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });

  const historyEntries = listQuery.data?.data ?? EMPTY_HISTORY_ENTRIES;
  const total = listQuery.data?.meta.total ?? 0;
  const currentPage = listQuery.data?.meta.page ?? page;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);
  const currentFilterDraft: HistoryFilterDraft = {
    entityType: urlEntityType,
    actionType: urlActionType,
    entityId: urlEntityId,
    startDate: urlStartDate,
    endDate: urlEndDate,
  };
  const filterSummaryChips = getFilterSummaryChips(currentFilterDraft);
  const narrowedFilterCount = countNarrowedFilters(currentFilterDraft, {
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });
  const expandedEntryCount = historyEntries.filter((entry) =>
    expandedEntryIds.includes(entry.id),
  ).length;

  const applyFilters = (draft: HistoryFilterDraft) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");
    setExpandedEntryIds([]);

    if (draft.entityType !== "all") {
      params.set("entityType", draft.entityType);
    } else {
      params.delete("entityType");
    }

    if (draft.actionType !== "all") {
      params.set("actionType", draft.actionType);
    } else {
      params.delete("actionType");
    }

    if (draft.entityId.trim()) {
      params.set("entityId", draft.entityId.trim());
    } else {
      params.delete("entityId");
    }

    params.set("startDate", draft.startDate);
    params.set("endDate", draft.endDate);
    replaceSearchParams(params);
  };

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");
    setExpandedEntryIds([]);
    params.delete("entityType");
    params.delete("actionType");
    params.delete("entityId");
    params.set("startDate", defaultStartDate);
    params.set("endDate", defaultEndDate);
    replaceSearchParams(params);
  };

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(nextPage));
    setExpandedEntryIds([]);
    replaceSearchParams(params);
  };

  const toggleEntry = (id: string) => {
    setExpandedEntryIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    );
  };

  const listErrorMessage =
    (listQuery.error as { response?: { data?: { message?: string } } })?.response
      ?.data?.message ??
    (listQuery.error as Error | undefined)?.message ??
    "Không tải được lịch sử thay đổi.";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 sm:gap-5">
        <section
          className="relative overflow-hidden rounded-[32px] border border-border-default shadow-sm motion-fade-up"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, color-mix(in srgb, var(--ue-primary) 18%, transparent), transparent 42%), radial-gradient(circle at top right, color-mix(in srgb, var(--ue-info) 12%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--ue-bg-secondary) 88%, transparent), var(--ue-bg-surface))",
          }}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in srgb, var(--ue-border-default) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--ue-border-default) 55%, transparent) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-focus/70 to-transparent" />

          <div className="relative px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface/85 text-primary shadow-sm backdrop-blur-sm">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    Audit Ledger
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                    Lịch sử chỉnh sửa
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary sm:text-[15px]">
                    Theo dõi mọi thao tác tạo, cập nhật và xóa dữ liệu trong một layout mobile-first
                    kiểu logbook: ưu tiên scan nhanh, giữ context filter và chỉ tải snapshot khi
                    mở đúng bản ghi.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:max-w-md xl:justify-end">
                <span className="rounded-full border border-border-default bg-bg-surface/85 px-3 py-1.5 text-xs font-medium text-text-secondary">
                  Recent first
                </span>
                <span className="rounded-full border border-border-default bg-bg-surface/85 px-3 py-1.5 text-xs font-medium text-text-secondary">
                  Lazy snapshot
                </span>
                <span className="rounded-full border border-border-default bg-bg-surface/85 px-3 py-1.5 text-xs font-medium text-text-secondary">
                  Mobile audit deck
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewStatCard
                eyebrow="Khoảng lọc"
                value={`${formatDateLabel(urlStartDate)} - ${formatDateLabel(urlEndDate)}`}
                caption="Mặc định giữ 30 ngày gần nhất."
              />
              <OverviewStatCard
                eyebrow="Bộ lọc hẹp"
                value={String(narrowedFilterCount)}
                caption={
                  narrowedFilterCount === 0
                    ? "Đang xem toàn bộ action trong khoảng ngày."
                    : "Có điều kiện bổ sung ngoài khoảng ngày mặc định."
                }
                accent
              />
              <OverviewStatCard
                eyebrow="Tổng bản ghi"
                value={formatMetricNumber(total)}
                caption={
                  total === 0
                    ? "Chưa có dữ liệu khớp bộ lọc hiện tại."
                    : `Trang này đang hiển thị ${formatMetricNumber(rangeStart)}-${formatMetricNumber(rangeEnd)}.`
                }
              />
              <OverviewStatCard
                eyebrow="Phân trang"
                value={`Trang ${currentPage}/${totalPages}`}
                caption="Timeline một cột, chi tiết mở trong cùng card."
              />
            </div>
          </div>
        </section>

        <HistoryFilterCard
          key={[urlEntityType, urlActionType, urlEntityId, urlStartDate, urlEndDate].join("|")}
          initialDraft={currentFilterDraft}
          summaryChips={filterSummaryChips}
          narrowedFilterCount={narrowedFilterCount}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <section className="min-w-0 flex-1 overflow-hidden rounded-[28px] border border-border-default bg-bg-surface shadow-sm motion-fade-up">
          {listQuery.isLoading ? (
            <HistoryTimelineSkeleton />
          ) : listQuery.isError ? (
            <div className="px-4 py-16 sm:px-5" role="alert">
              <div className="mx-auto max-w-lg rounded-2xl border border-error/20 bg-error/10 p-5 text-center text-error">
                <p className="text-sm">{listErrorMessage}</p>
              </div>
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="px-4 py-16 sm:px-5">
              <div className="mx-auto max-w-md rounded-[28px] border border-border-default bg-bg-secondary/30 px-5 py-10 text-center text-text-muted">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border border-border-default bg-bg-surface shadow-sm">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-text-primary">Chưa có lịch sử phù hợp</p>
                <p className="mt-2 text-sm leading-6">
                  Các hành động chỉnh sửa sẽ hiển thị tại đây khi có dữ liệu trùng với bộ lọc hiện
                  tại. Thử nới khoảng ngày hoặc bỏ exact `entityId`.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div
                className="border-b border-border-default px-4 py-4 sm:px-5"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, color-mix(in srgb, var(--ue-bg-secondary) 76%, transparent), transparent)",
                }}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p aria-live="polite" className="text-sm font-medium text-text-secondary">
                      Hiển thị {formatMetricNumber(rangeStart)}-{formatMetricNumber(rangeEnd)} trong{" "}
                      {formatMetricNumber(total)} bản ghi
                    </p>
                    <p className="mt-1 text-sm leading-6 text-text-muted">
                      Chạm vào từng card để mở snapshot before/after ngay trong timeline.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                      {filterSummaryChips.length} chip bộ lọc
                    </span>
                    <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                      {expandedEntryCount > 0
                        ? `${expandedEntryCount} card đang mở`
                        : "Chưa mở card nào"}
                    </span>
                  </div>
                </div>
              </div>

              <ol className="space-y-4 p-4 sm:p-6">
                {historyEntries.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === historyEntries.length - 1}
                    isExpanded={expandedEntryIds.includes(item.id)}
                    onToggle={toggleEntry}
                  />
                ))}
              </ol>

              {totalPages > 1 ? (
                <nav
                  className="flex flex-col gap-3 border-t border-border-default px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  aria-label="Phân trang action history"
                >
                  <div>
                    <p className="text-sm font-medium text-text-secondary">
                      Trang {currentPage}/{totalPages}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      Điều hướng page nhưng vẫn giữ nguyên toàn bộ query filter hiện tại.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => updatePage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="min-h-12 rounded-2xl border border-border-default bg-bg-surface px-3 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                    >
                      Trước
                    </button>
                    <span className="flex min-h-12 items-center justify-center rounded-2xl border border-border-default bg-bg-secondary/50 px-4 py-3 text-sm tabular-nums text-text-secondary">
                      {currentPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="min-h-12 rounded-2xl border border-border-default bg-bg-surface px-3 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
                    >
                      Sau
                    </button>
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
