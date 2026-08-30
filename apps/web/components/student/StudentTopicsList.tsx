"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { StudentTopicItem } from "@/dtos/student-class.dto";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentTopicsList({
  topics,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  classId,
}: {
  topics: StudentTopicItem[];
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  classId?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage || !fetchNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!topics.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/20 p-8 text-center text-sm text-text-muted">
        Chưa có chuyên đề học tập nào trong lớp học này.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic, index) => {
        const targetClassId = classId || topic.classId;
        const topicHref = `/student/classes/${targetClassId}/topics/${topic.id}`;

        return (
          <Link
            key={topic.id}
            href={topicHref}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-surface p-4 transition-all duration-200 hover:border-primary/50 hover:bg-bg-secondary/60 hover:shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
                    {topic.title}
                  </h3>
                  {topic.videoUrl && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Video
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <span className="text-xs font-medium text-text-muted group-hover:text-primary flex items-center gap-1">
                Xem chuyên đề
                <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        );
      })}

      {/* Sentinel for automatic infinite scroll */}
      {hasNextPage && (
        <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
      )}

      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-text-muted">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>Đang tải thêm chuyên đề…</span>
        </div>
      )}
    </div>
  );
}
