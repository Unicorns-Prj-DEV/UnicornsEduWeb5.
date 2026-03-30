"use client";

import CustomerCareDetailPanels from "@/components/customer-care/CustomerCareDetailPanels";
import { useParams, useRouter } from "next/navigation";

export default function AdminCustomerCareDetailPage() {
  const params = useParams();
  const staffId = typeof params?.staffId === "string" ? params.staffId : "";
  const router = useRouter();

  if (!staffId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <p className="text-sm text-text-muted">Không tìm thấy nhân sự.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:min-h-0 sm:min-w-0 sm:px-0"
      >
        <svg
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="hidden sm:inline">Quay lại</span>
      </button>

      <header className="mb-5 flex flex-col gap-4 sm:mb-6">
        <h1 className="text-lg font-semibold text-text-primary sm:text-xl">
          Chi tiết công việc CSKH
        </h1>
        <p className="text-sm text-text-muted">
          Học sinh chăm sóc, hoa hồng theo buổi và trạng thái thanh toán CSKH trong
          30 ngày qua.
        </p>
      </header>

      <CustomerCareDetailPanels staffId={staffId} workspaceMode="admin" />
    </div>
  );
}
