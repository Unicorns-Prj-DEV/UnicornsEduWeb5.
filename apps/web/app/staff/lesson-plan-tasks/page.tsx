"use client";

import { AdminLessonPlansWorkspace } from "@/components/admin/lesson-plans";

export default function StaffLessonPlannerWorkspacePage() {
  return (
    <AdminLessonPlansWorkspace
      basePath="/staff/lesson-plan-tasks"
      manageDetailsPath="/staff/lesson-plan-manage-details"
      taskDetailBasePath="/staff/lesson-plan-tasks"
      participantMode
      workspacePolicy="lesson_plan"
    />
  );
}
