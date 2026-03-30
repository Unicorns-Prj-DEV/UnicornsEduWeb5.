"use client";

import { useQuery } from "@tanstack/react-query";
import { LessonTaskDetailPage } from "@/app/admin/lesson-plans/tasks/[taskId]/page";
import { getFullProfile } from "@/lib/apis/auth.api";

export default function StaffLessonTaskDetailPage() {
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
    <LessonTaskDetailPage
      workspaceBasePath="/staff/lesson-plans"
      allowDelete={isAssistant}
    />
  );
}
