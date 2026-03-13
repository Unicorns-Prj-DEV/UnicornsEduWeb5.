"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as classApi from "@/lib/apis/class.api";
import { formatCurrency } from "@/lib/class.helpers";
import { ClassCard, ClassDetailRow, EditClassPopup, ScheduleTimeCard, TutorCard } from "@/components/admin/class";
import { ClassStatus, ClassType, ClassDetail } from "@/dtos/class.dto";

type EditMode = "basic" | "tuition" | "schedule";

const STATUS_LABELS: Record<ClassStatus, string> = {
  running: "Đang chạy",
  ended: "Đã kết thúc",
};

const TYPE_LABELS: Record<ClassType, string> = {
  basic: "Basic",
  vip: "VIP",
  advance: "Advance",
  hardcore: "Hardcore",
};

export default function AdminClassDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const [editMode, setEditMode] = useState<EditMode | null>(null);

  const {
    data: classDetail,
    isLoading,
    isError,
    error,
  } = useQuery<ClassDetail>({
    queryKey: ["class", "detail", id],
    queryFn: () => classApi.getClassById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
          <div className="h-64 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
        </div>
        <p className="sr-only" aria-live="polite" aria-busy="true">
          Đang tải…
        </p>
      </div>
    );
  }

  if (!id || isError || !classDetail) {
    const message = !id
      ? "Thiếu mã lớp học."
      : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (error as Error)?.message ??
      "Không tìm thấy lớp học.";

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại danh sách lớp
        </button>
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
          <p>{message}</p>
        </div>
      </div>
    );
  }

  const scheduleItems = Array.isArray(classDetail.schedule)
    ? classDetail.schedule.filter((item) => item?.from && item?.to)
    : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Quay lại danh sách lớp
      </button>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block size-3 shrink-0 rounded-full ${classDetail.status === "running" ? "bg-warning" : "bg-text-muted"}`}
            title={STATUS_LABELS[classDetail.status]}
            aria-hidden
          />
          <h1 className="text-xl font-semibold text-text-primary">{classDetail.name?.trim() || "Lớp học"}</h1>
        </div>
      </header>

      <EditClassPopup
        open={!!editMode}
        mode={editMode ?? "basic"}
        onClose={() => setEditMode(null)}
        classDetail={classDetail}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <ClassCard
            className="flex-1"
            title="Thông tin cơ bản"
            action={(
              <button
                type="button"
                onClick={() => setEditMode("basic")}
                className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Edit
              </button>
            )}
          >
            <dl className="divide-y divide-border-subtle">
              <ClassDetailRow label="ID" value={classDetail.id} />
              <ClassDetailRow label="Tên lớp" value={classDetail.name?.trim() || "—"} />
              <ClassDetailRow label="Loại lớp" value={TYPE_LABELS[classDetail.type] ?? classDetail.type} />
              <ClassDetailRow label="Trạng thái" value={STATUS_LABELS[classDetail.status] ?? classDetail.status} />
              <ClassDetailRow label="Sĩ số tối đa" value={classDetail.maxStudents ?? "—"} />
              <ClassDetailRow
                label="Allowance/buổi/học sinh"
                value={formatCurrency(classDetail.allowancePerSessionPerStudent)}
              />
              <ClassDetailRow
                label="Allowance tối đa/buổi"
                value={formatCurrency(classDetail.maxAllowancePerSession)}
              />
              <ClassDetailRow label="Scale amount" value={classDetail.scaleAmount ?? "—"} />
            </dl>
          </ClassCard>

          <div className="flex flex-col gap-4 flex-1">

            <ClassCard
              className="flex-1"
              title="Học phí"
              action={(
                <button
                  type="button"
                  onClick={() => setEditMode("tuition")}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Edit
                </button>
              )}
            >
              <dl className="divide-y divide-border-subtle">
                <ClassDetailRow
                  label="Học phí mỗi buổi"
                  value={formatCurrency(classDetail.studentTuitionPerSession)}
                />
                <ClassDetailRow
                  label="Gói học phí tổng"
                  value={formatCurrency(classDetail.tuitionPackageTotal)}
                />
                <ClassDetailRow
                  label="Số buổi gói học phí"
                  value={classDetail.tuitionPackageSession ?? "—"}
                />
              </dl>
            </ClassCard>

            <ClassCard
              className="flex-1"
              title="Khung giờ học"
              action={(
                <button
                  type="button"
                  onClick={() => setEditMode("schedule")}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Edit
                </button>
              )}
            >
              {scheduleItems.length > 0 ? (
                <div className="space-y-3">
                  {scheduleItems.map((item, index) => (
                    <ScheduleTimeCard
                      key={`${item.from}-${item.to}-${index}`}
                      index={index + 1}
                      from={item.from}
                      to={item.to}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/50 px-4 py-6 text-center text-sm text-text-muted">
                  Chưa có khung giờ học.
                </div>
              )}
            </ClassCard>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <TutorCard teachers={classDetail.teachers} />
        </div>
      </div>
    </div>
  );
}
