"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronDown, Eye, Layers, PenLine } from "lucide-react";
import * as classApi from "@/lib/apis/class.api";
import { classKeys } from "@/lib/query-keys";
import type {
  ClassContentItemDto,
  ClassContentModuleGroupDto,
  TheoryProgressTarget,
} from "@/dtos/class-content.dto";
import { formatVnDateTime } from "@/lib/formatters";
import { TimelineKindBadge } from "@/components/class-timeline/TimelineKindBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ACTION_CLASS =
  "inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border-default px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary";

interface ClassModuleGroupsProps {
  classId: string;
  /** Có thì hiện nút Thống kê / Chấm bài cho tiết thực hành. */
  practiceActionsBasePath?: string | null;
  /** Mở dialog chi tiết lần giao (`ClassContentManager`). */
  onOpenItem: (contentItemId: string) => void;
  /** Có thì hiện nút Tiến độ cho tiết lý thuyết. */
  onOpenTheoryProgress?: (target: TheoryProgressTarget) => void;
}

/**
 * Nội dung lớp gom theo chuyên đề: mỗi nhóm có tiết lý thuyết (thứ tự trong
 * chuyên đề) rồi tiết thực hành đã giao. Buổi học / khảo sát ở timeline riêng.
 */
export default function ClassModuleGroups({
  classId,
  practiceActionsBasePath,
  onOpenItem,
  onOpenTheoryProgress,
}: ClassModuleGroupsProps) {
  const { data: groups = [], isLoading, isError } = useQuery({
    queryKey: classKeys.contentGroups(classId),
    queryFn: () => classApi.getClassContentGroups(classId),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
        Không tải được nội dung theo chuyên đề.
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-default p-6 text-center text-sm text-text-muted">
        Lớp chưa thêm chuyên đề nào. Bấm <b>Chuyên đề</b> để thêm.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <ModuleGroupCard
          key={group.moduleId ?? "ungrouped"}
          group={group}
          practiceActionsBasePath={practiceActionsBasePath}
          onOpenItem={onOpenItem}
          onOpenTheoryProgress={onOpenTheoryProgress}
        />
      ))}
    </div>
  );
}

function ModuleGroupCard({
  group,
  practiceActionsBasePath,
  onOpenItem,
  onOpenTheoryProgress,
}: {
  group: ClassContentModuleGroupDto;
} & Omit<ClassModuleGroupsProps, "classId">) {
  const items = [...group.theoryItems, ...group.practiceItems];
  return (
    <Collapsible
      defaultOpen
      className="rounded-xl border border-border-default bg-bg-surface shadow-sm"
    >
      <CollapsibleTrigger className="group flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left hover:bg-bg-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus">
        <Layers className="size-4 shrink-0 text-text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-text-primary">
              {group.title}
            </span>
            {group.moduleId && !group.added ? (
              <span className="inline-flex rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                Đã gỡ khỏi lớp
              </span>
            ) : null}
          </div>
          <p className="text-xs text-text-muted">
            {group.theoryItems.length} tiết lý thuyết ·{" "}
            {group.practiceItems.length} tiết thực hành đã giao
          </p>
        </div>
        <ChevronDown
          className="size-4 shrink-0 text-text-muted transition-transform group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 px-3 pb-3">
        {items.length === 0 ? (
          <p className="py-2 text-center text-xs text-text-muted">
            Chuyên đề chưa có tiết lý thuyết hay tiết thực hành đã giao.
          </p>
        ) : (
          items.map((item) => (
            <ContentItemRow
              key={item.id}
              item={item}
              practiceActionsBasePath={practiceActionsBasePath}
              onOpenItem={onOpenItem}
              onOpenTheoryProgress={onOpenTheoryProgress}
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ContentItemRow({
  item,
  practiceActionsBasePath,
  onOpenItem,
  onOpenTheoryProgress,
}: {
  item: ClassContentItemDto;
} & Omit<ClassModuleGroupsProps, "classId">) {
  const isPractice = item.lessonKind === "practice";
  const schedule = isPractice
    ? [
        item.openAt ? `Mở: ${formatVnDateTime(item.openAt)}` : null,
        item.durationMinutes ? `${item.durationMinutes} phút` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const showPracticeActions = isPractice && Boolean(practiceActionsBasePath);
  const showTheoryActions = !isPractice && Boolean(onOpenTheoryProgress);

  return (
    <div
      className={`rounded-lg border border-border-default bg-bg-secondary/20 p-2 ${item.hiddenAt ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        onClick={() => onOpenItem(item.id)}
        className="block w-full cursor-pointer rounded-md p-1 text-left hover:bg-bg-secondary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span className="flex flex-wrap items-center gap-2">
          <TimelineKindBadge kind="content_item" lessonKind={item.lessonKind} />
          {item.hiddenAt ? (
            <span className="inline-flex rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold text-error">
              Đã ẩn
            </span>
          ) : null}
        </span>
        <span className="mt-1 block truncate text-sm font-medium text-text-primary">
          {item.title}
        </span>
        {schedule ? (
          <span className="mt-0.5 block text-xs text-text-muted">{schedule}</span>
        ) : null}
      </button>
      {showPracticeActions || showTheoryActions ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1">
          {showPracticeActions ? (
            <>
              <Link
                href={`${practiceActionsBasePath}/practice/${item.id}/stats`}
                className={ACTION_CLASS}
              >
                <BarChart3 className="size-3.5" />
                Thống kê
              </Link>
              <Link
                href={`${practiceActionsBasePath}/grading/${item.id}`}
                className={ACTION_CLASS}
              >
                <PenLine className="size-3.5" />
                Chấm bài
              </Link>
            </>
          ) : null}
          {showTheoryActions ? (
            <button
              type="button"
              onClick={() =>
                onOpenTheoryProgress?.({
                  contentItemId: item.id,
                  title: item.title,
                })
              }
              className={`${ACTION_CLASS} cursor-pointer`}
            >
              <Eye className="size-3.5" />
              Tiến độ
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
