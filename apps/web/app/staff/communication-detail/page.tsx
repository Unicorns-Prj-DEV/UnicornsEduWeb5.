"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import ExtraAllowanceRoleDetailPage from "@/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage";
import StaffSelfExtraAllowanceRoleDetailPage from "@/components/staff/StaffSelfExtraAllowanceRoleDetailPage";
import { getFullProfile } from "@/lib/apis/auth.api";

export default function StaffCommunicationDetailPage() {
  const searchParams = useSearchParams();
  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const staffId = searchParams.get("staffId");
  const isAssistant =
    profile?.roleType === "staff" &&
    (profile.staffInfo?.roles ?? []).includes("assistant");

  if (isAssistant && staffId?.trim()) {
    return <ExtraAllowanceRoleDetailPage roleType="communication" staffId={staffId} />;
  }

  return (
    <StaffSelfExtraAllowanceRoleDetailPage roleType="communication" allowCreate />
  );
}
