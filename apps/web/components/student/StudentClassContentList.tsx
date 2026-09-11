"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ClassContentItemDto } from "@/dtos/class-content.dto";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVnDayMonthTime } from "@/lib/formatters";

function formatOpenAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return formatVnDayMonthTime(new Date(iso));
  } catch {
    return "";
  }
}

export default function StudentClassContentList({
  items,
  classId,
  isLoading,
}: {
  items: ClassContentItemDto[];
  classId: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/20 p-8 text-center text-sm text-text-muted">
        Chưa có nội dung học tập nào trong lớp học này.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const locked = item.topicKind === "practice" && !item.isOpen;
        const href =
          item.topicKind === "practice"
            ? `/student/classes/${classId}/assignments/${item.id}`
            : `/student/classes/${classId}/topics/${item.topicId}`;
        const meta =
          item.topicKind === "practice"
            ? locked
              ? item.openAt
                ? `Mở lúc ${formatOpenAt(item.openAt)}`
                : "Chưa mở"
              : `${item.durationMinutes ?? "—"} phút`
            : null;

        const inner = (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                    {item.kindLabel}
                  </span>
                  {item.chapterTitle && (
                    <span className="text-[10px] text-text-muted">
                      {item.chapterTitle}
                    </span>
                  )}
                </div>
                {meta && (
                  <p className="mt-0.5 text-[11px] text-text-muted">{meta}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              {locked ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted">
                  <Lock className="size-3.5" />
                  Chưa mở
                </span>
              ) : (
                <span className="text-xs font-medium text-text-muted group-hover:text-primary flex items-center gap-1">
                  {item.topicKind === "practice" ? "Làm bài" : "Xem nội dung"}
                  <svg
                    className="size-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              )}
            </div>
          </>
        );

        if (locked) {
          return (
            <button
              key={item.id}
              type="button"
              disabled
              aria-disabled="true"
              aria-label={`${item.title} — luyện tập chưa mở`}
              className="flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-secondary/40 p-4 text-left"
            >
              {inner}
            </button>
          );
        }

        return (
          <Link
            key={item.id}
            href={href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface p-4 transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-primary/50 hover:bg-bg-secondary/60 hover:shadow-sm"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
