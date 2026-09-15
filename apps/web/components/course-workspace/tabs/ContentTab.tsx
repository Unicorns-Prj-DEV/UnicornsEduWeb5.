"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CourseModulesPanel } from "@/components/course-workspace/CourseModulesPanel";
import { CourseLessonsPanel } from "@/components/course-workspace/CourseLessonsPanel";
import type { CourseWorkspaceRouteBase } from "@/dtos/course-workspace.dto";
import {
  courseDetailHref,
  newLessonHref,
  lessonHref,
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
  const moduleId = searchParams.get("module");

  const setModuleQuery = (nextModuleId: string | null) => {
    replace(
      courseDetailHref(routeBase, courseId, {
        tab: "noi-dung",
        module: nextModuleId,
      }),
      { scroll: false },
    );
  };

  if (moduleId) {
    return (
      <CourseLessonsPanel
        courseId={courseId}
        moduleId={moduleId}
        canEdit={canEdit}
        onBack={() => setModuleQuery(null)}
        onOpenLesson={(lesson) =>
          push(lessonHref(routeBase, courseId, moduleId, lesson.id))
        }
        onCreateLesson={() => push(newLessonHref(routeBase, courseId, moduleId))}
        onOrderDirtyChange={onOrderDirtyChange}
      />
    );
  }

  return (
    <CourseModulesPanel
      courseId={courseId}
      canEdit={canEdit}
      onOpenModule={(id) => setModuleQuery(id)}
      onOrderDirtyChange={onOrderDirtyChange}
    />
  );
}
