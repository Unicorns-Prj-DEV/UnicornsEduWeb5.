"use client";

import { useSearchParams } from "next/navigation";
import ExtraAllowanceRoleDetailPage from "@/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage";

export default function AdminCommunicationDetailPage() {
  const searchParams = useSearchParams();

  return (
    <ExtraAllowanceRoleDetailPage
      roleType="communication"
      staffId={searchParams.get("staffId")}
    />
  );
}
