"use client";

import { useSearchParams } from "next/navigation";
import ExtraAllowanceRoleDetailPage from "@/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage";

export default function AdminAccountantDetailPage() {
  const searchParams = useSearchParams();

  return (
    <ExtraAllowanceRoleDetailPage
      roleType="accountant"
      staffId={searchParams.get("staffId")}
    />
  );
}
