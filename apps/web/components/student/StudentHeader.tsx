"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import * as authApi from "@/lib/apis/auth.api";
import { clearLogoutScopedQueries } from "@/lib/query-invalidation";
import { SidebarThemePicker } from "@/components/shell";
import UserAvatar from "@/components/ui/UserAvatar";
import { BrandLogoLockup } from "@/components/BrandLogoLockup";
import { cn } from "@/lib/utils";

export default function StudentHeader() {
  const { push } = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: fullProfile } = useQuery({
    queryKey: ["auth", "fullProfile"],
    queryFn: authApi.getFullProfile,
    staleTime: 60 * 1000,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.studentLogout(),
    onSuccess: async () => {
      clearLogoutScopedQueries(queryClient);
      toast.success("Đã đăng xuất");
      push("/auth/login");
    },
    onError: () => {
      toast.error("Đăng xuất thất bại");
    },
  });

  const avatarSrc = fullProfile?.avatarUrl || undefined;
  const displayName =
    fullProfile?.studentInfo?.fullName ||
    fullProfile?.accountHandle ||
    user?.accountHandle ||
    "Học sinh";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="relative z-40 w-full shrink-0 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-2xl border border-border-default bg-bg-surface/85 px-3 shadow-lg backdrop-blur-md transition-colors sm:h-16 sm:px-4">
        <Link
          href="/student"
          className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <BrandLogoLockup variant="navbar" showWordmark={true} wordmarkClassName="hidden md:inline" />
        </Link>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <StudentNavAction href="/user-profile" label="Hồ sơ & Lịch thi" iconPath={PROFILE_ICON_PATH} />
          <StudentNavAction href="/student/tuition" label="Nạp ví" iconPath={WALLET_ICON_PATH} primary />

          <div className="mx-1 hidden h-6 w-px bg-border-default sm:block" aria-hidden="true" />

          <SidebarThemePicker compact onMobileClose={() => {}} />

          <Link
            href="/user-profile"
            prefetch={false}
            className="flex items-center gap-2.5 rounded-full p-1 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <UserAvatar
              src={avatarSrc}
              fallback={avatarInitial}
              alt={`Avatar của ${displayName}`}
              className="size-8 ring-1 ring-border-default sm:size-9"
              fallbackClassName="text-xs font-semibold"
            />
            <span className="hidden max-w-[120px] truncate text-xs font-semibold text-text-primary lg:inline">
              {displayName}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger hover:text-text-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

const PROFILE_ICON_PATH =
  "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z";
const WALLET_ICON_PATH =
  "M3 10h18M7 15h4m-7 4h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z";

/** Nút điều hướng trên navbar: màn hẹp chỉ icon, từ `sm` hiện chữ. */
function StudentNavAction({
  href,
  label,
  iconPath,
  primary = false,
}: {
  href: string;
  label: string;
  iconPath: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:size-auto sm:px-3 sm:py-2",
        primary
          ? "bg-primary text-text-inverse hover:bg-primary-hover"
          : "border border-border-default bg-bg-secondary/60 text-text-primary hover:bg-bg-secondary",
      )}
    >
      <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
      <span className="hidden whitespace-nowrap sm:inline">{label}</span>
    </Link>
  );
}
