"use client";

import { useSearchParams } from "next/navigation";
import ExtraAllowanceRoleDetailPage from "@/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage";
import type { ExtraAllowanceRoleType } from "@/dtos/extra-allowance.dto";

export default function AdminAccountantDetailPage() {
  const searchParams = useSearchParams();
  const getSearchParam = searchParams.get.bind(searchParams);
  const roleTypeParam = getSearchParam("roleType");
  const roleType: Extract<
    ExtraAllowanceRoleType,
    "accountant" | "accountant_income" | "accountant_expense"
  > =
    roleTypeParam === "accountant_income" ||
    roleTypeParam === "accountant_expense"
      ? roleTypeParam
      : "accountant";

  return (
    <ExtraAllowanceRoleDetailPage
      roleType={roleType}
      staffId={getSearchParam("staffId")}
    />
  );
}
