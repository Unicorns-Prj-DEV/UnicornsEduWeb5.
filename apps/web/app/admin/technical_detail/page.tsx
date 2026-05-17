"use client";

import { useSearchParams } from "next/navigation";
import ExtraAllowanceRoleDetailPage from "@/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage";

export default function AdminTechnicalDetailPage() {
  const searchParams = useSearchParams();
  const getSearchParam = searchParams.get.bind(searchParams);

  return (
    <ExtraAllowanceRoleDetailPage
      roleType="technical"
      staffId={getSearchParam("staffId")}
    />
  );
}
