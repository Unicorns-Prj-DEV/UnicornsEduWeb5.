"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Search, BookOpen, Dumbbell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCourseTopicsForClass } from "@/lib/apis/class.api";
import type { CourseTopicForClassDto } from "@/dtos/topic.dto";

interface CourseTopicPickerProps {
  classId: string;
  selectedTopicId: string;
  onSelect: (topicId: string, kind: CourseTopicForClassDto["kind"]) => void;
}

export default function CourseTopicPicker({
  classId,
  selectedTopicId,
  onSelect,
}: CourseTopicPickerProps) {
  const [search, setSearch] = useState("");

  const { data: topics, isLoading } = useQuery<CourseTopicForClassDto[]>({
    queryKey: ["course-topics-for-class", classId],
    queryFn: () => getCourseTopicsForClass(classId),
  });

  const filtered = useMemo(() => {
    if (!topics) return [];
    if (!search.trim()) return topics;
    const q = search.toLowerCase();
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.chapterTitle.toLowerCase().includes(q),
    );
  }, [topics, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CourseTopicForClassDto[]>();
    for (const t of filtered) {
      const arr = map.get(t.chapterTitle) ?? [];
      arr.push(t);
      map.set(t.chapterTitle, arr);
    }
    return map;
  }, [filtered]);

  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(
    () => new Set(),
  );
  const isSearching = search.trim().length > 0;

  function toggleChapter(chapterTitle: string) {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterTitle)) next.delete(chapterTitle);
      else next.add(chapterTitle);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/20 p-6 text-center text-sm text-text-muted">
        Khoá học này chưa có chuyên đề nào. Hãy tạo chuyên đề trong quản trị
        khoá học trước.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Tìm chuyên đề"
          placeholder="Tìm chuyên đề..."
          className="w-full rounded-xl border border-border-default bg-bg-surface pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto overscroll-contain space-y-3 [scrollbar-width:thin]">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-text-muted">
            Không tìm thấy chuyên đề phù hợp.
          </div>
        )}

        {Array.from(grouped.entries()).map(([chapterTitle, chapterTopics]) => {
          const expanded = isSearching || !collapsedChapters.has(chapterTitle);
          return (
            <ChapterBranch
              key={chapterTitle}
              chapterTitle={chapterTitle}
              topics={chapterTopics}
              expanded={expanded}
              selectedTopicId={selectedTopicId}
              onToggle={() => toggleChapter(chapterTitle)}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChapterBranch({
  chapterTitle,
  topics,
  expanded,
  selectedTopicId,
  onToggle,
  onSelect,
}: {
  chapterTitle: string;
  topics: CourseTopicForClassDto[];
  expanded: boolean;
  selectedTopicId: string;
  onToggle: () => void;
  onSelect: (id: string, kind: CourseTopicForClassDto["kind"]) => void;
}) {
  const panelId = `chapter-topics-${chapterTitle.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="rounded-xl border border-border-default bg-bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-text-muted transition-transform",
            expanded && "rotate-90",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-text-muted">
          {chapterTitle}
        </span>
        <span className="shrink-0 text-xs text-text-muted">{topics.length}</span>
      </button>
      {expanded && (
        <div
          id={panelId}
          role="group"
          className="space-y-1.5 border-t border-border-default px-2 pb-2 pt-1.5 sm:px-3"
        >
          {topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              isSelected={topic.id === selectedTopicId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicRow({
  topic,
  isSelected,
  onSelect,
}: {
  topic: CourseTopicForClassDto;
  isSelected: boolean;
  onSelect: (id: string, kind: CourseTopicForClassDto["kind"]) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !topic.alreadyAdded && onSelect(topic.id, topic.kind)}
      disabled={topic.alreadyAdded}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        topic.alreadyAdded
          ? "border-border-default bg-bg-secondary/30 opacity-60 cursor-not-allowed"
          : isSelected
            ? "border-primary bg-primary/5 cursor-pointer"
            : "border-border-default hover:border-border-focus/50 cursor-pointer",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          topic.kind === "theory"
            ? "bg-primary/10 text-primary"
            : "bg-accent/10 text-accent",
        )}
      >
        {topic.kind === "theory" ? (
          <BookOpen className="size-4" />
        ) : (
          <Dumbbell className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">
          {topic.title}
        </div>
        <div className="text-xs text-text-muted">
          {topic.kind === "theory" ? "Lý thuyết" : "Luyện tập"}
          {topic.lectureCount > 0 && ` · ${topic.lectureCount} bài học`}
        </div>
      </div>
      {topic.alreadyAdded ? (
        <span className="shrink-0 text-xs font-medium text-text-muted">
          Đã thêm
        </span>
      ) : (
        isSelected && (
          <Check className="size-4 shrink-0 text-primary" />
        )
      )}
    </button>
  );
}
