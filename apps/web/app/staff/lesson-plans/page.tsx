"use client";

import { AdminLessonPlansWorkspace } from "@/components/admin/lesson-plans";

export default function StaffLessonPlansPage() {
  return (
    <AdminLessonPlansWorkspace
      basePath="/staff/lesson-plans"
      manageDetailsPath="/staff/lesson-manage-details"
      taskDetailBasePath="/staff/lesson-plans/tasks"
    />
  );
}
