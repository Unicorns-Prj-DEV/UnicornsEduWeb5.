"use client";

import { useSearchParams } from "next/navigation";
import ExtraAllowanceRoleDetailPage from "@/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage";

export default function AdminTechnicalDetailPage() {
  const searchParams = useSearchParams();

  return (
    <ExtraAllowanceRoleDetailPage
      roleType="technical"
      staffId={searchParams.get("staffId")}
    />
  );
}
