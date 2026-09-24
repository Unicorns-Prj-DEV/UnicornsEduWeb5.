import type { CourseWorkspaceRouteBase } from "@/dtos/course-workspace.dto";

/**
 * Next.js page hrefs for the course content tree (admin / staff / student).
 *
 * Keep this module separate from `content-api-paths.ts` (Axios endpoints).
 */

export function courseDetailHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  query?: { tab?: string; module?: string | null },
): string {
  const params = new URLSearchParams();
  if (query?.tab) params.set("tab", query.tab);
  if (query?.module) params.set("module", query.module);
  const qs = params.toString();
  return `${routeBase}/courses/${courseId}${qs ? `?${qs}` : ""}`;
}

export function moduleLessonsHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  moduleId: string,
): string {
  return courseDetailHref(routeBase, courseId, {
    tab: "noi-dung",
    module: moduleId,
  });
}

export function newLessonHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  moduleId: string,
): string {
  return `${routeBase}/courses/${courseId}/modules/${moduleId}/lessons/new`;
}

export function lessonHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  moduleId: string,
  lessonId: string,
): string {
  return `${routeBase}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`;
}

export function studentClassLessonsHref(classId: string): string {
  return `/student/classes/${classId}?tab=lessons`;
}

export function studentLessonHref(classId: string, lessonId: string): string {
  return `/student/classes/${classId}/lessons/${lessonId}`;
}
