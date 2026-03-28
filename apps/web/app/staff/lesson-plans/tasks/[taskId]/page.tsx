"use client";

import { LessonTaskDetailPage } from "@/app/admin/lesson-plans/tasks/[taskId]/page";

export default function StaffLessonTaskDetailPage() {
  return <LessonTaskDetailPage workspaceBasePath="/staff/lesson-plans" />;
}
