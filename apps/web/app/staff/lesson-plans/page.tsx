"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminLessonPlansWorkspace } from "@/components/admin/lesson-plans";
import { getFullProfile } from "@/lib/apis/auth.api";

export default function StaffLessonPlansPage() {
  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const isAssistant =
    profile?.roleType === "staff" &&
    (profile.staffInfo?.roles ?? []).includes("assistant");

  return (
    <AdminLessonPlansWorkspace
      basePath="/staff/lesson-plans"
      manageDetailsPath="/staff/lesson-manage-details"
      taskDetailBasePath="/staff/lesson-plans/tasks"
      workspacePolicy={isAssistant ? "admin" : "lesson_plan_head"}
    />
  );
}
