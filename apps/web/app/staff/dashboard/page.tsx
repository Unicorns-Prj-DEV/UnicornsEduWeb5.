"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getFullProfile } from "@/lib/apis/auth.api";

export default function StaffAssistantDashboardPage() {
  const router = useRouter();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isLoading) return;

    const ownStaffId = profile?.staffInfo?.id?.trim();
    const isAssistant =
      profile?.roleType === "staff" &&
      (profile.staffInfo?.roles ?? []).includes("assistant");

    if (isAssistant && ownStaffId) {
      router.replace(`/staff/staffs/${encodeURIComponent(ownStaffId)}`);
      return;
    }

    router.replace("/staff");
  }, [isLoading, profile, router]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-[1020px]">
        <section className="overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(18,86,104,0.12),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(246,250,252,0.94))] shadow-sm">
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                Assistant Dashboard
              </p>
              <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.03em] text-text-primary sm:text-3xl">
                Đang mở staff detail riêng của trợ lí.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                Dashboard trong staff shell của trợ lí luôn trỏ vào hồ sơ nhân sự của chính bạn,
                thay vì hiển thị dashboard tổng hợp của admin.
              </p>
            </div>

            <div className="grid gap-3 rounded-[1.25rem] border border-primary/15 bg-bg-surface/80 p-4 backdrop-blur">
              <div className="rounded-xl border border-border-default bg-bg-secondary/35 p-3">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                  Điều hướng
                </p>
                <div className="mt-2 h-2 w-28 animate-pulse rounded-full bg-primary/20" />
              </div>
              <div className="rounded-xl border border-border-default bg-bg-secondary/35 p-3">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
                  Đang chuyển
                </p>
                <div className="mt-2 h-2 w-36 animate-pulse rounded-full bg-primary/20" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
