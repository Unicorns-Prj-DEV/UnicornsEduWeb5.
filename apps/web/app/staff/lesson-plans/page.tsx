"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminLessonPlansWorkspace } from "@/components/admin/lesson-plans";
import { getFullProfile } from "@/lib/apis/auth.api";
import { resolveAdminShellAccess } from "@/lib/admin-shell-access";

export default function StaffLessonPlansPage() {
  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const { isAssistant, isAccountant } = resolveAdminShellAccess(profile);

  return (
    <AdminLessonPlansWorkspace
      basePath="/staff/lesson-plans"
      manageDetailsPath="/staff/lesson-manage-details"
      taskDetailBasePath="/staff/lesson-plans/tasks"
      workspacePolicy={
        isAssistant ? "admin" : isAccountant ? "accountant" : "lesson_plan_head"
      }
    />
  );
}
