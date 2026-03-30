import { NextRequest, NextResponse } from "next/server";
import { getUser } from "./lib/auth-server";

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const user = await getUser();
    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

    if (isAdminRoute) {
        if (user?.roleType === "admin") {
            return NextResponse.next();
        }

        if (user?.roleType === "staff") {
            const refreshToken = req.cookies.get("refresh_token")?.value;
            if (refreshToken) {
                try {
                    const response = await fetch(`${API_URL}/auth/me/full`, {
                        headers: {
                            Cookie: `refresh_token=${refreshToken}`,
                        },
                        cache: "no-store",
                    });

                    if (response.ok) {
                        const profile = (await response.json()) as {
                            staffInfo?: { roles?: string[] | null } | null;
                        };
                        const roles = profile.staffInfo?.roles ?? [];

                        if (roles.includes("assistant")) {
                            return NextResponse.next();
                        }
                    }
                } catch {
                    return NextResponse.redirect(new URL("/", req.url));
                }
            }
        }

        return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
}
