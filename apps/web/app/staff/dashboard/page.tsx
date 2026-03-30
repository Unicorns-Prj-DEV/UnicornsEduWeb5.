"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getFullProfile } from "@/lib/apis/auth.api";
import AdminStaffDetailPage from "@/app/admin/staffs/[id]/page";

export default function StaffAssistantDashboardPage() {
  const router = useRouter();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });

  const ownStaffId = profile?.staffInfo?.id?.trim() ?? "";
  const isAssistant =
    profile?.roleType === "staff" &&
    (profile.staffInfo?.roles ?? []).includes("assistant");

  useEffect(() => {
    if (isLoading) return;
    if (!isAssistant || !ownStaffId) {
      router.replace("/staff");
    }
  }, [isLoading, isAssistant, ownStaffId, router]);

  if (isLoading || !isAssistant || !ownStaffId) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
        <div className="mb-6 flex h-8 w-64 animate-pulse rounded bg-bg-tertiary" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-36 animate-pulse rounded bg-bg-tertiary" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-bg-tertiary" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-bg-tertiary" />
              <div className="h-4 w-4/6 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-28 animate-pulse rounded bg-bg-tertiary" />
            <div className="h-40 w-full animate-pulse rounded bg-bg-tertiary" />
          </div>
        </div>
      </div>
    );
  }

  return <AdminStaffDetailPage staffId={ownStaffId} />;
}
