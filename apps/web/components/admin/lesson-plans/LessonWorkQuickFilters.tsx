"use client";

import { useState, type ReactNode } from "react";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import type {
  LessonOutputStaffOption,
  LessonOutputStatus,
} from "@/dtos/lesson.dto";
import { LESSON_OUTPUT_STATUS_LABELS } from "./lessonTaskUi";

export type LessonWorkFilterDraft = {
  search: string;
  tag: string;
  outputStatus: string;
  staffId: string;
  dateFrom: string;
  dateTo: string;
};

const OUTPUT_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  ...(
    ["pending", "completed", "cancelled"] as LessonOutputStatus[]
  ).map((value) => ({
    value,
    label: LESSON_OUTPUT_STATUS_LABELS[value],
  })),
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft: LessonWorkFilterDraft;
  onApply: (draft: LessonWorkFilterDraft) => void;
  onClear: () => void;
  staffOptions: LessonOutputStaffOption[];
  footerNote?: ReactNode | null;
};

export default function LessonWorkQuickFilters({
  open,
  onOpenChange,
  initialDraft,
  onApply,
  onClear,
  staffOptions,
  footerNote,
}: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const staffSelectOptions = [
    { value: "", label: "Tất cả nhân sự" },
    ...staffOptions.map((s) => ({
      value: s.id,
      label: s.fullName,
    })),
  ];

  return (
    <div className="rounded-xl border border-border-default bg-bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
        aria-expanded={open}
      >
        <span>Bộ lọc nhanh</span>
        <span className="inline-flex items-center gap-2 text-text-secondary">
          <span className="hidden sm:inline">
            {open ? "Thu gọn" : "Mở bộ lọc"}
          </span>
          <svg
            className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border-default px-4 py-4 sm:px-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
              <span>Tìm kiếm</span>
              <span className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="search"
                  value={draft.search}
                  onChange={(e) =>
                    setDraft((current) => ({ ...current, search: e.target.value }))
                  }
                  placeholder="Tìm theo tên hoặc tag"
                  className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
              <span>Tag</span>
              <input
                type="text"
                value={draft.tag}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, tag: e.target.value }))
                }
                placeholder="Tìm kiếm và chọn tag"
                className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <div className="flex flex-col gap-1.5 text-sm text-text-secondary">
              <span>Trạng thái</span>
              <UpgradedSelect
                value={draft.outputStatus}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    outputStatus: value || "all",
                  }))
                }
                options={OUTPUT_FILTER_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                ariaLabel="Trạng thái output"
                placeholder="Tất cả"
                buttonClassName="min-h-11 w-full justify-between rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-left text-sm text-text-primary shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-text-secondary">
              <span>Nhân sự</span>
              <UpgradedSelect
                value={draft.staffId}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, staffId: value ?? "" }))
                }
                options={staffSelectOptions}
                ariaLabel="Nhân sự phụ trách"
                placeholder="Tất cả nhân sự"
                buttonClassName="min-h-11 w-full justify-between rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-left text-sm text-text-primary shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
              <span>Từ ngày</span>
              <span className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      dateFrom: e.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
              <span>Đến ngày</span>
              <span className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      dateTo: e.target.value,
                    }))
                  }
                  className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-2 lg:flex-row lg:justify-end lg:gap-2">
              <button
                type="button"
                onClick={() => onApply(draft)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Áp dụng
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Xóa lọc
              </button>
            </div>
          </div>

          {footerNote === null ? null : footerNote !== undefined ? (
            <div className="text-xs leading-5 text-text-muted">{footerNote}</div>
          ) : (
            <p className="text-xs leading-5 text-text-muted">
              Khi chọn <strong>Từ ngày</strong> và <strong>Đến ngày</strong> hợp
              lệ, danh sách lọc theo khoảng ngày đó (thay lọc theo tháng ở bảng
              bên dưới). Để trống hai ô ngày để chỉ dùng lọc theo tháng đang xem.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
