"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CourseChaptersPanel } from "@/components/course-workspace/CourseChaptersPanel";
import { CourseTopicsPanel } from "@/components/course-workspace/CourseTopicsPanel";
import type { CourseWorkspaceRouteBase } from "@/dtos/course-workspace.dto";
import {
  courseDetailHref,
  newTopicHref,
  topicHref,
} from "@/lib/course-content-routes";

export function ContentTab({
  courseId,
  canEdit,
  routeBase,
  onOrderDirtyChange,
}: {
  courseId: string;
  canEdit: boolean;
  routeBase: CourseWorkspaceRouteBase;
  onOrderDirtyChange?: (dirty: boolean) => void;
}) {
  const { push, replace } = useRouter();
  const searchParams = useSearchParams();
  const chapterId = searchParams.get("chapter");

  const setChapterQuery = (nextChapterId: string | null) => {
    replace(
      courseDetailHref(routeBase, courseId, {
        tab: "noi-dung",
        chapter: nextChapterId,
      }),
      { scroll: false },
    );
  };

  if (chapterId) {
    return (
      <CourseTopicsPanel
        courseId={courseId}
        chapterId={chapterId}
        canEdit={canEdit}
        onBack={() => setChapterQuery(null)}
        onOpenTopic={(topic) =>
          push(topicHref(routeBase, courseId, chapterId, topic.id))
        }
        onCreateTopic={() => push(newTopicHref(routeBase, courseId, chapterId))}
        onOrderDirtyChange={onOrderDirtyChange}
      />
    );
  }

  return (
    <CourseChaptersPanel
      courseId={courseId}
      canEdit={canEdit}
      onOpenChapter={(id) => setChapterQuery(id)}
      onOrderDirtyChange={onOrderDirtyChange}
    />
  );
}
