"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy entry: assistant sidebar trước đây trỏ `/staff/dashboard` → staff detail.
 * Giờ dashboard chuẩn là `/staff`; route này redirect để bookmark/link cũ vẫn hoạt động.
 */
export default function StaffDashboardRedirectPage() {
  const { replace } = useRouter();

  useEffect(() => {
    replace("/staff");
  }, [replace]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-bg-tertiary" />
    </div>
  );
}
