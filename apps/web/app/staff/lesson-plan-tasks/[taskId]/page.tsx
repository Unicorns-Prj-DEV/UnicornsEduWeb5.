"use client";

import { LessonTaskDetailPage } from "@/app/admin/lesson-plans/tasks/[taskId]/page";

export default function StaffLessonPlannerTaskDetailPage() {
  return (
    <LessonTaskDetailPage
      workspaceBasePath="/staff/lesson-plan-tasks"
      participantMode
      allowDelete={false}
    />
  );
}
