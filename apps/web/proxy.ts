import { NextRequest, NextResponse } from "next/server";
import { getUser } from "./lib/auth-server";

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const user = await getUser(req.headers.get("cookie") ?? undefined);
    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
    const isStrictAdminNotificationRoute =
        pathname === "/admin/notification" ||
        pathname.startsWith("/admin/notification/");

    if (isAdminRoute) {
        if (user?.roleType === "admin") {
            return NextResponse.next();
        }

        if (user?.roleType === "staff") {
            const roles = user.staffRoles ?? [];
            if (roles.includes("assistant")) {
                if (isStrictAdminNotificationRoute) {
                    return NextResponse.redirect(
                        new URL("/staff/notification", req.url),
                    );
                }
                return NextResponse.next();
            }
        }

        return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/staff/:path*", "/student/:path*", "/user-profile/:path*"],
};
