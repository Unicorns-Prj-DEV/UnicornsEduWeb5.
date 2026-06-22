import {
  buildAdminLikePath,
  type AdminLikeRouteBase,
} from "@/lib/admin-shell-paths";

export function buildUserManageHref(
  routeBase: AdminLikeRouteBase,
  userId: string,
): string {
  const params = new URLSearchParams({ manage: userId });
  return `${buildAdminLikePath(routeBase, "users")}?${params.toString()}`;
}

export function buildStaffDetailHref(
  routeBase: AdminLikeRouteBase,
  staffId: string,
): string {
  return buildAdminLikePath(routeBase, `staffs/${encodeURIComponent(staffId)}`);
}

export function buildStudentDetailHref(
  routeBase: AdminLikeRouteBase,
  studentId: string,
): string {
  return buildAdminLikePath(
    routeBase,
    `students/${encodeURIComponent(studentId)}`,
  );
}
