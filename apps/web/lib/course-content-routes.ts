import type { CourseWorkspaceRouteBase } from "@/dtos/course-workspace.dto";

/**
 * Next.js page hrefs for the course content tree (admin / staff / student).
 *
 * Keep this module separate from `content-api-paths.ts` (Axios endpoints).
 * Upcoming rename tickets should only edit segment / query names here for UI links.
 */

export function courseDetailHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  query?: { tab?: string; chapter?: string | null },
): string {
  const params = new URLSearchParams();
  if (query?.tab) params.set("tab", query.tab);
  if (query?.chapter) params.set("chapter", query.chapter);
  const qs = params.toString();
  return `${routeBase}/courses/${courseId}${qs ? `?${qs}` : ""}`;
}

export function chapterTopicsHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  chapterId: string,
): string {
  return courseDetailHref(routeBase, courseId, {
    tab: "noi-dung",
    chapter: chapterId,
  });
}

export function newTopicHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  chapterId: string,
): string {
  return `${routeBase}/courses/${courseId}/chapters/${chapterId}/topics/new`;
}

export function topicHref(
  routeBase: CourseWorkspaceRouteBase,
  courseId: string,
  chapterId: string,
  topicId: string,
  lectureId?: string,
): string {
  const base = `${routeBase}/courses/${courseId}/chapters/${chapterId}/topics/${topicId}`;
  if (!lectureId) return base;
  return `${base}?lecture=${encodeURIComponent(lectureId)}`;
}

export function studentClassTopicsHref(classId: string): string {
  return `/student/classes/${classId}?tab=topics`;
}

export function studentTopicHref(classId: string, topicId: string): string {
  return `/student/classes/${classId}/topics/${topicId}`;
}
