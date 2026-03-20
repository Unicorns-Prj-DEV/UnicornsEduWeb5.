"use client";

import { useEffect, useState } from "react";
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

function formatValuePreview(value: unknown) {
  if (value == null) {
    return "null";
  }

  if (typeof value === "string") {
    const compact = value.trim();
    if (!compact) {
      return '""';
    }

    return compact.length > 60 ? `${compact.slice(0, 57)}...` : compact;
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
    extractEntityNameFromSnapshot(detail?.afterValue) ??
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

function HistoryTimelineSkeleton() {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="space-y-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="relative pl-10">
            <div className="absolute left-0 top-4 size-5 rounded-full border-4 border-bg-surface bg-bg-tertiary" />
            {index < 4 ? (
              <div className="absolute left-[9px] top-9 h-[calc(100%+1.25rem)] w-px bg-border-default" />
            ) : null}
            <div className="h-48 animate-pulse rounded-2xl border border-border-default bg-bg-secondary/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineItem({
  item,
  isLast,
  isSelected,
  detail,
  isDetailLoading,
  isDetailError,
  detailErrorMessage,
  onToggle,
}: {
  item: ActionHistoryListItem;
  isLast: boolean;
  isSelected: boolean;
  detail: ActionHistoryDetail | undefined;
  isDetailLoading: boolean;
  isDetailError: boolean;
  detailErrorMessage: string;
  onToggle: (id: string) => void;
}) {
  const tone = getActionTone(item.actionType);
  const changedFieldEntries = getChangedFieldEntries(item.changedFields);
  const dateTime = formatDateTime(item.createdAt);
  const entryTitle = getEntryTitle(item, isSelected ? detail : undefined);

  return (
    <li className="relative pl-10">
      <div
        className={`absolute left-0 top-4 z-10 size-5 rounded-full border-4 border-bg-surface ${tone.marker}`}
      />
      {!isLast ? (
        <div className="absolute left-[9px] top-9 h-[calc(100%+1.25rem)] w-px bg-border-default" />
      ) : null}

      <article
        className={`overflow-hidden rounded-2xl border bg-bg-surface shadow-sm transition-[border-color,background-color] duration-200 ${isSelected
          ? "border-border-focus"
          : "border-border-default hover:border-border-focus/70 hover:bg-bg-secondary/35"
          }`}
      >
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="w-full rounded-2xl px-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:px-5 sm:py-5"
          aria-expanded={isSelected}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
              </div>

              <h2 className="mt-3 text-base font-semibold text-text-primary sm:text-lg">
                {entryTitle}
              </h2>

              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {item.description?.trim() || "Không có mô tả thao tác."}
              </p>

              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <div className="rounded-xl border border-border-default bg-bg-secondary/45 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Thời gian
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-secondary">
                    {dateTime.date} {dateTime.time}
                  </p>
                </div>

                <div className="rounded-xl border border-border-default bg-bg-secondary/45 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Người thực hiện
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-text-secondary">
                    {item.userEmail || "Không xác định"}
                  </p>
                </div>

                <div className="rounded-xl border border-border-default bg-bg-secondary/45 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Entity ID
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-text-secondary">
                    {item.entityId || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start xl:flex-col xl:items-end">
              <span className="inline-flex rounded-full border border-border-default bg-bg-secondary/70 px-3 py-1 text-xs font-medium text-text-secondary">
                {changedFieldEntries.length} trường
              </span>
              <span className="inline-flex size-10 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted">
                <svg
                  className={`size-4 transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`}
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
          </div>
        </button>

        {changedFieldEntries.length > 0 ? (
          <details
            className="border-t border-border-default bg-bg-secondary/20 px-4 py-4 sm:px-5"
            open={isSelected ? true : undefined}
          >
            <summary className={`cursor-pointer list-none text-sm font-medium ${tone.summary}`}>
              Trường đã thay đổi ({changedFieldEntries.length})
            </summary>
            <div className="mt-3 grid gap-2">
              <div className="space-y-2">
                {changedFieldEntries.map(([field, change]) => (
                  <div
                    key={field}
                    className="rounded-xl border border-border-default bg-bg-surface px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-text-primary">{field}</p>
                    <div className="mt-2 flex flex-col gap-1 text-xs leading-6 sm:flex-row sm:items-start sm:gap-3">
                      <span
                        className={`rounded-lg bg-bg-secondary px-2 py-1 ${tone.previewFrom}`}
                      >
                        {formatValuePreview(change.old)}
                      </span>
                      <span className="text-text-muted">→</span>
                      <span
                        className={`rounded-lg bg-bg-secondary px-2 py-1 font-medium ${tone.previewTo}`}
                      >
                        {formatValuePreview(change.new)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ) : null}

        {isSelected ? (
          <div className="border-t border-border-default bg-bg-secondary/20 px-4 py-4 sm:px-5">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Snapshot chi tiết
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Dữ liệu trước và sau chỉ được tải khi mở bản ghi này.
              </p>
            </div>

            {isDetailLoading ? (
              <div className="grid gap-3 xl:grid-cols-2">
                <div className="h-44 animate-pulse rounded-xl border border-border-default bg-bg-secondary" />
                <div className="h-44 animate-pulse rounded-xl border border-border-default bg-bg-secondary" />
              </div>
            ) : isDetailError ? (
              <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error">
                {detailErrorMessage}
              </div>
            ) : detail ? (
              <div className="grid gap-3 xl:grid-cols-2">
                <section className="rounded-xl border border-border-default bg-bg-surface p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Trước khi thay đổi
                  </h3>
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-border-default bg-bg-secondary/45 p-3 text-xs leading-6 text-text-secondary">
                    {formatJsonBlock(detail.beforeValue)}
                  </pre>
                </section>

                <section className="rounded-xl border border-border-default bg-bg-surface p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Sau khi thay đổi
                  </h3>
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-border-default bg-bg-secondary/45 p-3 text-xs leading-6 text-text-primary">
                    {formatJsonBlock(detail.afterValue)}
                  </pre>
                </section>
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  );
}

function HistoryFilterCard({
  initialDraft,
  onApply,
  onReset,
}: {
  initialDraft: HistoryFilterDraft;
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
    <section className="rounded-2xl border border-border-default bg-bg-surface shadow-sm">
      <div className="border-b border-border-default px-4 py-4 sm:px-5">
        <h2 className="text-sm font-semibold text-text-primary">Bộ lọc timeline</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Giữ đúng query path backend hiện tại: lọc theo loại đối tượng, thao tác, khoảng ngày và
          exact `entityId`.
        </p>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.9fr_0.9fr_1.1fr_auto_auto] xl:items-end">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text-secondary">
            Loại đối tượng
          </span>
          <UpgradedSelect
            name="entityType"
            value={entityType}
            onValueChange={setEntityType}
            options={ENTITY_OPTIONS}
            ariaLabel="Chọn loại đối tượng"
            buttonClassName="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-text-primary shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            menuClassName="rounded-2xl border border-border-default bg-bg-surface p-1.5 shadow-2xl"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text-secondary">
            Loại hành động
          </span>
          <UpgradedSelect
            name="actionType"
            value={actionType}
            onValueChange={setActionType}
            options={ACTION_OPTIONS}
            ariaLabel="Chọn loại hành động"
            buttonClassName="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-left text-sm font-medium text-text-primary shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            menuClassName="rounded-2xl border border-border-default bg-bg-surface p-1.5 shadow-2xl"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text-secondary">Từ ngày</span>
          <input
            type="date"
            name="startDate"
            autoComplete="off"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-border-focus focus:ring-2 focus:ring-border-focus"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text-secondary">Đến ngày</span>
          <input
            type="date"
            name="endDate"
            autoComplete="off"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-border-focus focus:ring-2 focus:ring-border-focus"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text-secondary">
            Entity ID exact
          </span>
          <input
            type="text"
            name="entityId"
            autoComplete="off"
            spellCheck={false}
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Nhập UUID chính xác"
            className={`min-h-11 w-full rounded-xl border bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 ${
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
            <span className="mt-2 block text-xs text-text-muted">
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
          className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Áp dụng
        </button>

        <button
          type="button"
          onClick={onReset}
          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default function AdminHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePage(searchParams.get("page"));
  const selectedEntryId = isUuid(searchParams.get("entry"))
    ? searchParams.get("entry")
    : null;
  const urlEntityType = normalizeSelectValue(searchParams.get("entityType"));
  const urlActionType = normalizeSelectValue(searchParams.get("actionType"));
  const urlEntityId = searchParams.get("entityId") ?? "";
  const urlStartDate = normalizeDateParam(
    searchParams.get("startDate"),
    getDefaultStartDate(),
  );
  const urlEndDate = normalizeDateParam(
    searchParams.get("endDate"),
    getDefaultEndDate(),
  );

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

  useEffect(() => {
    if (!selectedEntryId || listQuery.isLoading) {
      return;
    }

    if (historyEntries.some((entry) => entry.id === selectedEntryId)) {
      return;
    }

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("entry");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [historyEntries, listQuery.isLoading, pathname, router, searchParams, selectedEntryId]);

  const detailQuery = useQuery({
    queryKey: ["action-history", "detail", selectedEntryId],
    queryFn: () => actionHistoryApi.getActionHistoryById(selectedEntryId!),
    enabled: !!selectedEntryId,
    staleTime: 30_000,
  });

  const applyFilters = (draft: HistoryFilterDraft) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");
    params.delete("entry");

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
    params.delete("entry");
    params.delete("entityType");
    params.delete("actionType");
    params.delete("entityId");
    params.set("startDate", getDefaultStartDate());
    params.set("endDate", getDefaultEndDate());
    replaceSearchParams(params);
  };

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(nextPage));
    params.delete("entry");
    replaceSearchParams(params);
  };

  const toggleEntry = (id: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (selectedEntryId === id) {
      params.delete("entry");
    } else {
      params.set("entry", id);
    }

    replaceSearchParams(params);
  };

  const detailErrorMessage =
    (detailQuery.error as { response?: { data?: { message?: string } } })?.response
      ?.data?.message ??
    (detailQuery.error as Error | undefined)?.message ??
    "Không tải được chi tiết bản ghi lịch sử.";

  const listErrorMessage =
    (listQuery.error as { response?: { data?: { message?: string } } })?.response
      ?.data?.message ??
    (listQuery.error as Error | undefined)?.message ??
    "Không tải được lịch sử thay đổi.";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4">
        <section className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm">
          <div className="border-b border-border-default bg-bg-secondary/35 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-primary shadow-sm">
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

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                    Admin Audit
                  </p>
                  <h1 className="mt-2 text-xl font-semibold text-text-primary sm:text-2xl">
                    Lịch sử chỉnh sửa
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
                    Theo dõi mọi thao tác tạo, cập nhật và xóa dữ liệu. Bố cục được dựng lại theo
                    timeline một cột từ bản archived để rà soát thay đổi nhanh hơn trên cả desktop
                    lẫn mobile.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                  Recent first
                </span>
                <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                  Detail tải khi mở bản ghi
                </span>
                <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
                  30 ngày gần nhất mặc định
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-3">
            <div className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Khoảng lọc hiện tại
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                {urlStartDate} → {urlEndDate}
              </p>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Tổng bản ghi
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">{total}</p>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-surface px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Phân trang
              </p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                Trang {currentPage}/{totalPages}
              </p>
            </div>
          </div>
        </section>

        <HistoryFilterCard
          key={[urlEntityType, urlActionType, urlEntityId, urlStartDate, urlEndDate].join("|")}
          initialDraft={{
            entityType: urlEntityType,
            actionType: urlActionType,
            entityId: urlEntityId,
            startDate: urlStartDate,
            endDate: urlEndDate,
          }}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <section className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm">
          {listQuery.isLoading ? (
            <HistoryTimelineSkeleton />
          ) : listQuery.isError ? (
            <div className="px-4 py-16 text-center text-error" role="alert">
              <p className="text-sm">{listErrorMessage}</p>
            </div>
          ) : historyEntries.length === 0 ? (
            <div className="px-4 py-16 text-center text-text-muted">
              <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full border border-border-default bg-bg-secondary/60">
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
              <p className="text-lg font-medium text-text-primary">Chưa có lịch sử phù hợp</p>
              <p className="mt-2 text-sm">
                Các hành động chỉnh sửa sẽ hiển thị tại đây khi có dữ liệu trùng với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 border-b border-border-default bg-bg-secondary/25 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p aria-live="polite" className="text-text-secondary">
                  Hiển thị {rangeStart}-{rangeEnd} trong {total} bản ghi
                </p>
                <p className="text-text-muted">
                  Nhấn vào từng card để mở snapshot trước/sau ngay trong timeline.
                </p>
              </div>

              <ol className="space-y-5 p-4 sm:p-6">
                {historyEntries.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === historyEntries.length - 1}
                    isSelected={selectedEntryId === item.id}
                    detail={selectedEntryId === item.id ? detailQuery.data : undefined}
                    isDetailLoading={selectedEntryId === item.id && detailQuery.isLoading}
                    isDetailError={selectedEntryId === item.id && detailQuery.isError}
                    detailErrorMessage={detailErrorMessage}
                    onToggle={toggleEntry}
                  />
                ))}
              </ol>

              {totalPages > 1 ? (
                <nav
                  className="flex flex-col gap-3 border-t border-border-default px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  aria-label="Phân trang action history"
                >
                  <p className="text-sm text-text-muted">
                    Trang {currentPage}/{totalPages}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => updatePage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                      className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-secondary/50 px-3 py-2.5 text-sm tabular-nums text-text-secondary">
                      {currentPage}
                    </span>
                    <button
                      type="button"
                      onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage >= totalPages}
                      className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
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
