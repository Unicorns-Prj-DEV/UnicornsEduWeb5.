"use client";

import { useSearchParams } from "next/navigation";
import ExtraAllowanceRoleDetailPage from "@/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage";

export default function AdminAssistantDetailPage() {
  const searchParams = useSearchParams();

  return (
    <ExtraAllowanceRoleDetailPage
      roleType="assistant"
      staffId={searchParams.get("staffId")}
    />
  );
}
