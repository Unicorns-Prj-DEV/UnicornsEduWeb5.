import { NextRequest, NextResponse } from "next/server";
import { getUser } from "./lib/auth-server";
import { shouldVerifySessionInProxy } from "./lib/proxy-auth-guard";

const API_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

type FullProfileGuardPayload = {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    province?: string | null;
    staffInfo?: {
        cccdNumber?: string | null;
        cccdIssuedDate?: string | null;
        cccdIssuedPlace?: string | null;
        birthDate?: string | null;
        university?: string | null;
        highSchool?: string | null;
        specialization?: string | null;
        bankAccount?: string | null;
        bankQrLink?: string | null;
        cccdFrontPath?: string | null;
        cccdBackPath?: string | null;
    } | null;
};

function hasText(value: unknown): boolean {
    return typeof value === "string" && value.trim().length > 0;
}

function isValidCccd(value: string | null | undefined): boolean {
    if (!value) return false;
    return /^\d{12}$/.test(value.trim());
}

function isStaffProfileComplete(profile: FullProfileGuardPayload): boolean {
    const staffInfo = profile.staffInfo;
    if (!staffInfo) return false;

    return (
        hasText(profile.first_name) &&
        hasText(profile.last_name) &&
        hasText(profile.email) &&
        hasText(profile.phone) &&
        hasText(profile.province) &&
        isValidCccd(staffInfo.cccdNumber) &&
        hasText(staffInfo.cccdIssuedDate) &&
        hasText(staffInfo.cccdIssuedPlace) &&
        hasText(staffInfo.birthDate) &&
        hasText(staffInfo.university) &&
        hasText(staffInfo.highSchool) &&
        hasText(staffInfo.specialization) &&
        hasText(staffInfo.bankAccount) &&
        hasText(staffInfo.bankQrLink) &&
        hasText(staffInfo.cccdFrontPath) &&
        hasText(staffInfo.cccdBackPath)
    );
}

async function fetchFullProfile(cookieHeader: string): Promise<FullProfileGuardPayload | null> {
    try {
        const response = await fetch(`${API_URL}/users/me/full`, {
            headers: { Cookie: cookieHeader },
            cache: "no-store",
        });
        if (!response.ok) return null;
        return (await response.json()) as FullProfileGuardPayload;
    } catch {
        return null;
    }
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (
        !shouldVerifySessionInProxy({
            pathname,
            searchParams: req.nextUrl.searchParams,
            headers: req.headers,
        })
    ) {
        return NextResponse.next();
    }

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

    const isStaffRoute = pathname === "/staff" || pathname.startsWith("/staff/");
    if (isStaffRoute && user?.roleType === "staff") {
        const cookieHeader = req.headers.get("cookie") ?? "";
        const profile = await fetchFullProfile(cookieHeader);

        if (!profile || !isStaffProfileComplete(profile)) {
            const redirectUrl = new URL("/user-profile", req.url);
            redirectUrl.searchParams.set("profile_required", "1");
            redirectUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(redirectUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        {
            source: "/admin/:path*",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
        {
            source: "/staff/:path*",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
        {
            source: "/student/:path*",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
        {
            source: "/user-profile/:path*",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
};
