import { Role, UserInfoDto } from "@/dtos/Auth.dto";
import { cookies } from "next/headers";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

/**
 * Get the current user from auth cookies in a Server Component, Route Handler, or Server Action.
 * Reads the access_token cookie and calls the backend /auth/profile to resolve user info.
 * Returns a guest user when unauthenticated or on error.
 */
export async function getUser(): Promise<UserInfoDto> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return { id: "", accountHandle: "", roleType: Role.guest };
  }

  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { id: "", accountHandle: "", roleType: Role.guest };
    }

    const data = (await res.json()) as {
      id?: string;
      accountHandle?: string;
      roleType?: string;
    };

    const roleType =
      data.roleType && Object.values(Role).includes(data.roleType as Role)
        ? (data.roleType as Role)
        : Role.guest;

    return {
      id: data.id ?? "",
      accountHandle: data.accountHandle ?? "",
      roleType,
    };
  } catch {
    return { id: "", accountHandle: "", roleType: Role.guest };
  }
}
