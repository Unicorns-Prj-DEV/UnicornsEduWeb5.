import { createGuestUser, Role, UserInfoDto } from "@/dtos/Auth.dto";
import { cookies } from "next/headers";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

function buildCookieHeader(entries: Array<{ name: string; value: string }>) {
  return entries.map((entry) => `${entry.name}=${entry.value}`).join("; ");
}

/**
 * Get the current user from auth cookies in a Server Component, Route Handler, Server Action, or proxy.
 * Calls the backend /auth/session endpoint and returns a guest user on unauthenticated/error states.
 */
export async function getUser(cookieHeader?: string): Promise<UserInfoDto> {
  const requestCookieHeader =
    cookieHeader ??
    buildCookieHeader((await cookies()).getAll().map(({ name, value }) => ({ name, value })));

  if (!requestCookieHeader.includes("refresh_token=")) {
    return createGuestUser();
  }

  try {
    const res = await fetch(`${API_URL}/auth/session`, {
      headers: {
        Cookie: requestCookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return createGuestUser();
    }

    const data = (await res.json()) as {
      id?: string;
      email?: string;
      emailVerified?: boolean;
      canAccessRestrictedRoutes?: boolean;
      accountHandle?: string;
      roleType?: string;
      requiresPasswordSetup?: boolean;
      avatarUrl?: string | null;
      staffRoles?: string[];
      hasStaffProfile?: boolean;
      hasStudentProfile?: boolean;
    };

    const roleType =
      data.roleType && Object.values(Role).includes(data.roleType as Role)
        ? (data.roleType as Role)
        : Role.guest;

    return {
      id: data.id ?? "",
      email: data.email ?? "",
      emailVerified: Boolean(data.emailVerified),
      canAccessRestrictedRoutes:
        typeof data.canAccessRestrictedRoutes === "boolean"
          ? data.canAccessRestrictedRoutes
          : false,
      accountHandle: data.accountHandle ?? "",
      roleType,
      requiresPasswordSetup:
        typeof data.requiresPasswordSetup === "boolean"
          ? data.requiresPasswordSetup
          : false,
      avatarUrl: data.avatarUrl ?? null,
      staffRoles: Array.isArray(data.staffRoles) ? data.staffRoles : [],
      hasStaffProfile: Boolean(data.hasStaffProfile),
      hasStudentProfile: Boolean(data.hasStudentProfile),
    };
  } catch {
    return createGuestUser();
  }
}
