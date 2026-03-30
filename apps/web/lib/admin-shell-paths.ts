export type AdminLikeRouteBase = "/admin" | "/staff";

export function resolveAdminLikeRouteBase(
  pathname?: string | null,
): AdminLikeRouteBase {
  return pathname?.startsWith("/staff") ? "/staff" : "/admin";
}

export function buildAdminLikePath(
  routeBase: AdminLikeRouteBase,
  path: string,
): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${routeBase}/${normalizedPath}`;
}

export function buildStaffRoleDetailHref(
  routeBase: AdminLikeRouteBase,
  role: string,
  staffId: string,
): string | null {
  const normalizedStaffId = encodeURIComponent(staffId);

  if (routeBase === "/staff") {
    if (role === "customer_care") {
      return `/staff/customer-care-detail/${normalizedStaffId}`;
    }

    if (role === "assistant") {
      return `/staff/assistant-detail?staffId=${normalizedStaffId}`;
    }

    if (role === "accountant") {
      return `/staff/accountant-detail?staffId=${normalizedStaffId}`;
    }

    if (role === "communication") {
      return `/staff/communication-detail?staffId=${normalizedStaffId}`;
    }

    if (role === "lesson_plan" || role === "lesson_plan_head") {
      return `/staff/lesson-plan-detail/${normalizedStaffId}`;
    }

    return null;
  }

  if (role === "customer_care") {
    return `/admin/customer_care_detail/${normalizedStaffId}`;
  }

  if (role === "assistant") {
    return `/admin/assistant_detail?staffId=${normalizedStaffId}`;
  }

  if (role === "accountant") {
    return `/admin/accountant_detail?staffId=${normalizedStaffId}`;
  }

  if (role === "communication") {
    return `/admin/communication_detail?staffId=${normalizedStaffId}`;
  }

  if (role === "lesson_plan" || role === "lesson_plan_head") {
    return `/admin/lesson_plan_detail/${normalizedStaffId}`;
  }

  return null;
}
