import type { UserInfoDto } from "@/dtos/Auth.dto";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/admin/dashboard",
  staff: "/staff",
  student: "/student",
  guest: "/",
};

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

function isAuthPath(path: string) {
  return path === "/auth" || path.startsWith("/auth/");
}

function shouldLandInAdminShell(session: UserInfoDto) {
  const staffRoles = session.staffRoles ?? [];
  return staffRoles.includes("admin") || staffRoles.includes("assistant");
}

export function readSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  if (isAuthPath(nextPath)) {
    return null;
  }

  return nextPath;
}

export function resolvePostLoginRedirect(
  session: UserInfoDto,
  requestedNextPath?: string | null,
): string {
  if (session.canAccessRestrictedRoutes === false) {
    return "/";
  }

  const safeNextPath = readSafeNextPath(requestedNextPath ?? null);
  if (safeNextPath) {
    return safeNextPath;
  }

  if (session.roleType === "admin") {
    return ROLE_REDIRECT.admin;
  }

  if (session.roleType === "staff") {
    if (!session.hasStaffProfile) {
      return "/user-profile";
    }

    if (shouldLandInAdminShell(session)) {
      return ROLE_REDIRECT.admin;
    }

    return ROLE_REDIRECT.staff;
  }

  if (session.roleType === "student") {
    return session.hasStudentProfile ? ROLE_REDIRECT.student : "/user-profile";
  }

  return ROLE_REDIRECT[session.roleType] ?? "/";
}

export function buildSetupPasswordHref(nextPath: string) {
  return `/auth/setup-password?next=${encodeURIComponent(nextPath)}`;
}

export function resolvePasswordSetupNextPath(
  pathname: string,
  searchParams: SearchParamsLike,
) {
  const explicitNextPath = readSafeNextPath(searchParams.get("next"));
  if (explicitNextPath) {
    return explicitNextPath;
  }

  if (isAuthPath(pathname)) {
    return "/";
  }

  const search = searchParams.toString();
  const currentPath = `${pathname}${search ? `?${search}` : ""}`;
  return readSafeNextPath(currentPath) ?? "/";
}
