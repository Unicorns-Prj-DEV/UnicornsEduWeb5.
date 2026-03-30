"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import LessonOutputFormPopup from "@/components/admin/lesson-plans/LessonOutputFormPopup";
import LessonOutputQuickPopup from "@/components/admin/lesson-plans/LessonOutputQuickPopup";
import LessonResourceFormPopup from "@/components/admin/lesson-plans/LessonResourceFormPopup";
import LessonTaskFormPopup from "@/components/admin/lesson-plans/LessonTaskFormPopup";
import {
  formatLessonDateOnly,
  formatLessonStaffRoleLabel,
  formatLessonStaffStatusLabel,
  LESSON_OUTPUT_STATUS_LABELS,
  LESSON_TASK_PRIORITY_LABELS,
  LESSON_TASK_STATUS_LABELS,
  lessonOutputStatusChipClass,
  lessonTaskPriorityChipClass,
  lessonTaskStatusChipClass,
} from "@/components/admin/lesson-plans/lessonTaskUi";
import type {
  CreateLessonResourcePayload,
  CreateLessonOutputPayload,
  CreateLessonTaskPayload,
  LessonResourceOption,
  LessonTaskDetail,
  LessonTaskItem,
} from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeTab(value: string | null) {
  if (value === "work" || value === "exercises") {
    return value;
  }

  return "overview";
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function TaskMetaCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[1.4rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{hint}</p>
    </article>
  );
}

function StaffCard({
  staff,
}: {
  staff: NonNullable<LessonTaskItem["createdByStaff"]>;
}) {
  return (
    <article className="rounded-[1.35rem] border border-border-default bg-bg-secondary/55 p-4">
      <p className="text-sm font-semibold text-text-primary">{staff.fullName}</p>
      <p className="mt-1 text-sm text-text-secondary">
        {formatLessonStaffRoleLabel(staff.roles)}
      </p>
      <p className="mt-2 text-xs text-text-muted">
        {formatLessonStaffStatusLabel(staff.status)}
      </p>
    </article>
  );
}

export function LessonTaskDetailPage({
  workspaceBasePath = "/admin/lesson-plans",
  participantMode = false,
  allowDelete: allowDeleteProp,
}: {
  workspaceBasePath?: string;
  participantMode?: boolean;
  allowDelete?: boolean;
}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const taskId = typeof params?.taskId === "string" ? params.taskId : "";
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [createOutputOpen, setCreateOutputOpen] = useState(false);
  const [createResourceOpen, setCreateResourceOpen] = useState(false);
  const [editResourceOpen, setEditResourceOpen] = useState(false);
  const [attachResourceOpen, setAttachResourceOpen] = useState(false);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  );
  const [resourceSearch, setResourceSearch] = useState("");
  const deferredResourceSearch = useDeferredValue(resourceSearch.trim());
  const canManageTask = !participantMode;
  const canDeleteInPage = allowDeleteProp ?? canManageTask;
  const canCreateResource = canManageTask || participantMode;
  const canOpenOutputPopup = canManageTask || participantMode;

  const backHref = useMemo(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("tab", normalizeTab(searchParams.get("tab")));
    nextParams.set(
      "resourcePage",
      String(normalizePositiveInt(searchParams.get("resourcePage"))),
    );
    nextParams.set(
      "taskPage",
      String(normalizePositiveInt(searchParams.get("taskPage"))),
    );
    nextParams.set(
      "workPage",
      String(normalizePositiveInt(searchParams.get("workPage"))),
    );
    return `${workspaceBasePath}?${nextParams.toString()}`;
  }, [searchParams, workspaceBasePath]);

  const {
    data: task,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<LessonTaskDetail>({
    queryKey: ["lesson", "task", taskId],
    queryFn: () => lessonApi.getLessonTaskById(taskId),
    enabled: !!taskId,
  });

  const {
    data: resourceOptions = [],
    isFetching: isResourceOptionsFetching,
    isError: isResourceOptionsError,
    error: resourceOptionsError,
    refetch: refetchResourceOptions,
  } = useQuery<LessonResourceOption[]>({
    queryKey: ["lesson", "resource-options", taskId, deferredResourceSearch],
    queryFn: () =>
      lessonApi.searchLessonResourceOptions({
        search: deferredResourceSearch || undefined,
        limit: 6,
        excludeTaskId: taskId,
      }),
    enabled: canManageTask && attachResourceOpen && !!taskId,
    placeholderData: keepPreviousData,
  });

  const resourceDetailQuery = useQuery({
    queryKey: ["lesson", "resource", selectedResourceId],
    queryFn: () => lessonApi.getLessonResourceById(selectedResourceId ?? ""),
    enabled: canManageTask && editResourceOpen && !!selectedResourceId,
  });

  const updateTaskMutation = useMutation({
    mutationFn: (payload: CreateLessonTaskPayload) =>
      lessonApi.updateLessonTask(taskId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson"] });
      toast.success("Đã cập nhật chi tiết công việc giáo án.");
      setEditPopupOpen(false);
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật công việc."),
      );
    },
  });

  const createOutputMutation = useMutation({
    mutationFn: lessonApi.createLessonOutput,
    onSuccess: () => {
      toast.success("Đã tạo lesson output mới.");
      setCreateOutputOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["lesson"] });
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể tạo lesson output."),
      );
    },
  });

  const createResourceMutation = useMutation({
    mutationFn: lessonApi.createLessonResource,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "task", taskId] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "resource-options"] }),
      ]);
      toast.success("Đã thêm tài nguyên vào công việc.");
      setCreateResourceOpen(false);
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể thêm tài nguyên."),
      );
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateLessonResourcePayload;
    }) => lessonApi.updateLessonResource(id, payload),
    onSuccess: async (updatedResource) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "task", taskId] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "resource-options"] }),
        queryClient.invalidateQueries({
          queryKey: ["lesson", "resource", updatedResource.id],
        }),
      ]);
      toast.success("Đã cập nhật tài nguyên giáo án.");
      setEditResourceOpen(false);
      setSelectedResourceId(null);
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật tài nguyên."),
      );
    },
  });

  const detachResourceMutation = useMutation({
    mutationFn: (resourceId: string) =>
      lessonApi.updateLessonResource(resourceId, {
        lessonTaskId: null,
      }),
    onSuccess: async (updatedResource) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "task", taskId] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "resource-options"] }),
        queryClient.invalidateQueries({
          queryKey: ["lesson", "resource", updatedResource.id],
        }),
      ]);

      if (selectedResourceId === updatedResource.id) {
        setEditResourceOpen(false);
        setSelectedResourceId(null);
      }

      toast.success("Đã gỡ tài nguyên khỏi công việc này.");
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể gỡ tài nguyên khỏi công việc."),
      );
    },
  });

  const attachExistingResourceMutation = useMutation({
    mutationFn: ({
      resourceId,
    }: {
      resourceId: string;
      previousTaskId: string | null;
    }) =>
      lessonApi.updateLessonResource(resourceId, {
        lessonTaskId: taskId,
      }),
    onSuccess: async (_updatedResource, variables) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "task", taskId] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "resource-options"] }),
      ];

      if (variables.previousTaskId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: ["lesson", "task", variables.previousTaskId],
          }),
        );
      }

      await Promise.all(invalidations);
      toast.success(
        variables.previousTaskId
          ? "Đã chuyển tài nguyên có sẵn sang công việc này."
          : "Đã gắn tài nguyên có sẵn vào công việc.",
      );
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể đính kèm tài nguyên."),
      );
    },
  });

  const handleSubmit = async (payload: CreateLessonTaskPayload) => {
    await updateTaskMutation.mutateAsync(payload);
  };

  const handleCreateOutput = async (payload: CreateLessonOutputPayload) => {
    await createOutputMutation.mutateAsync(payload);
  };

  const handleCreateResource = async (payload: CreateLessonResourcePayload) => {
    await createResourceMutation.mutateAsync(payload);
  };

  const openOutputDetail = (outputId: string) => {
    setSelectedOutputId(outputId);
  };

  const handleAttachExistingResource = async (resource: LessonResourceOption) => {
    await attachExistingResourceMutation.mutateAsync({
      resourceId: resource.id,
      previousTaskId: resource.lessonTaskId,
    });
  };

  const openEditResource = (id: string) => {
    setSelectedResourceId(id);
    setEditResourceOpen(true);
  };

  const handleUpdateResource = async (payload: CreateLessonResourcePayload) => {
    if (!selectedResourceId) {
      toast.error("Không tìm thấy tài nguyên để cập nhật.");
      return;
    }

    await updateResourceMutation.mutateAsync({
      id: selectedResourceId,
      payload,
    });
  };

  const handleDetachResource = async (resourceId: string) => {
    await detachResourceMutation.mutateAsync(resourceId);
  };

  const resourceOptionsSummary = useMemo(() => {
    if (isResourceOptionsFetching) {
      return "Đang tải tài nguyên từ bảng LessonResources…";
    }

    if (isResourceOptionsError) {
      return "Không tải được danh sách tài nguyên từ database.";
    }

    if (resourceOptions.length === 0) {
      return deferredResourceSearch
        ? "Không tìm thấy tài nguyên khớp nội dung đang nhập."
        : "Hiển thị tối đa 6 tài nguyên gần nhất ngoài task hiện tại.";
    }

    return deferredResourceSearch
      ? `Có ${resourceOptions.length} tài nguyên khớp tìm kiếm.`
      : `Có ${resourceOptions.length} tài nguyên sẵn sàng để đính kèm.`;
  }, [
    deferredResourceSearch,
    isResourceOptionsError,
    isResourceOptionsFetching,
    resourceOptions.length,
  ]);

  if (!taskId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto w-full max-w-5xl rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm">
          <p className="text-base font-semibold text-text-primary">
            Không tìm thấy công việc giáo án.
          </p>
          <Link
            href={backHref}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Quay lại trang giáo án
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-default bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
            Quay lại Giáo Án
          </Link>
        </div>

        {isLoading ? (
          <>
            <section className="rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div className="h-4 w-32 animate-pulse rounded-full bg-bg-tertiary" />
              <div className="mt-4 h-10 w-2/3 animate-pulse rounded-2xl bg-bg-tertiary" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-bg-tertiary" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-bg-tertiary" />
            </section>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[1.4rem] border border-border-default bg-bg-surface"
                />
              ))}
            </div>
          </>
        ) : isError || !task ? (
          <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
            <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
              <p className="text-base font-semibold text-text-primary">
                Không tải được chi tiết công việc.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                {getErrorMessage(error, "Đã có lỗi khi tải dữ liệu công việc.")}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Tải lại
                </button>
                <Link
                  href={backHref}
                  className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Trở về Giáo Án
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%)]"
                aria-hidden
              />

              <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                      Chi tiết công việc giáo án
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary text-balance sm:text-4xl">
                      {task.title ?? "Công việc chưa đặt tên"}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskStatusChipClass(
                          task.status,
                        )}`}
                      >
                        {LESSON_TASK_STATUS_LABELS[task.status]}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskPriorityChipClass(
                          task.priority,
                        )}`}
                      >
                        {LESSON_TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
                      {task.description?.trim() ||
                        (participantMode
                          ? "Chưa có mô tả chi tiết."
                          : "Chưa có mô tả chi tiết — mở chỉnh sửa để bổ sung.")}
                    </p>
                  </div>

                  {canManageTask ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditPopupOpen(true)}
                        className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        Chỉnh sửa công việc
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <TaskMetaCard
                    label="Hạn xử lý"
                    value={formatLessonDateOnly(task.dueDate)}
                    hint="Ngày hệ thống đang dùng để điều phối nhịp xử lý."
                  />
                  <TaskMetaCard
                    label="Phụ trách"
                    value={task.createdByStaff?.fullName ?? "Chưa khóa cụ thể"}
                    hint={
                      participantMode
                        ? "Thông tin owner hiện được giữ ở chế độ chỉ xem."
                        : "Có thể thay đổi trực tiếp trong popup chỉnh sửa."
                    }
                  />
                  <TaskMetaCard
                    label="Task Team"
                    value={String(task.assignees.length)}
                    hint="Số nhân sự đang được giao thực hiện task."
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Ghi chú
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Mô tả
                  </h2>
                </div>
              </div>

              <div className="mt-4 rounded-[1.35rem] border border-border-default bg-bg-secondary/45 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                  {task.description?.trim() ||
                    "Chưa có mô tả chi tiết."}
                </p>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[1.75rem] flex-1 border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                      Ownership
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                      Người chịu trách nhiệm
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Nhân sự đang đứng tên phụ trách và chịu ownership chính của
                      task này.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  {task.createdByStaff ? (
                    <StaffCard staff={task.createdByStaff} />
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      {participantMode
                        ? "Chưa gán người phụ trách cụ thể."
                        : "Chưa gán người phụ trách cụ thể. Mở popup chỉnh sửa để chọn lại."}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[1.75rem] flex-1 border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Execution
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Nhân sự thực hiện task
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Danh sách assignment thật của task. Đây là nhóm backend dùng
                    để xác định participant access cho staff giáo án.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {task.assignees.length > 0 ? (
                    task.assignees.map((assignee) => (
                      <StaffCard key={assignee.id} staff={assignee} />
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      {participantMode
                        ? "Task này hiện chưa được gán cho nhân sự nào ngoài bạn trong workspace participant."
                        : "Chưa có nhân sự thực hiện task. Mở popup chỉnh sửa để gán assignment."}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="gap-6 flex flex-col">
              <section className="rounded-[1.75rem] flex-1 border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                      Sản phẩm
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                      Sản phẩm bài học
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {participantMode
                        ? "Danh sách sản phẩm thuộc công việc này; bạn có thể thêm output mới cho đúng task mình đang tham gia."
                        : "Danh sách sản phẩm thuộc công việc này; có thể tạo thêm sản phẩm mới tại đây."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-text-secondary">
                      {task.outputProgress.completed}/{task.outputProgress.total} hoàn
                      thành
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreateOutputOpen(true)}
                      className="inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Tạo sản phẩm
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {task.outputs.length > 0 ? (
                    task.outputs.map((output) => (
                      <button
                        key={output.id}
                        type="button"
                        onClick={() => openOutputDetail(output.id)}
                        className="flex w-full flex-col gap-3 rounded-[1.35rem] border border-border-default bg-bg-secondary/45 p-4 text-left transition-colors hover:bg-bg-secondary/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        aria-label={`Mở chi tiết lesson output ${output.lessonName}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-text-primary">
                              {output.lessonName}
                            </p>
                            <p className="mt-1 text-sm text-text-secondary">
                              {output.contestUploaded ?? "Chưa ghi cuộc thi/đề"}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonOutputStatusChipClass(
                              output.status,
                            )}`}
                          >
                            {LESSON_OUTPUT_STATUS_LABELS[output.status]}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                            <span>Ngày: {formatLessonDateOnly(output.date)}</span>
                            {!participantMode ? (
                              <span>
                                Nhân sự output:{" "}
                                {output.staffDisplayName ?? output.staffId ?? "Chưa gán"}
                              </span>
                            ) : null}
                          </div>
                          {canOpenOutputPopup ? (
                            <span className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                              {participantMode ? "Xem chi tiết" : "Mở popup"}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      Chưa có sản phẩm bài học nào.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[1.75rem] flex-1 border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                      Tài nguyên
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                      Tài nguyên liên quan
                    </h2>
                  </div>
                  {canCreateResource ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {canManageTask ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAttachResourceOpen((previous) => {
                              const next = !previous;
                              if (!next) {
                                setResourceSearch("");
                              }
                              return next;
                            });
                          }}
                          className={`inline-flex min-h-11 items-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${attachResourceOpen
                            ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
                            : "border-border-default bg-bg-surface text-text-primary hover:bg-bg-tertiary"
                            }`}
                        >
                          Đính kèm từ DB
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setCreateResourceOpen(true)}
                        className="inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        Thêm tài nguyên
                      </button>
                    </div>
                  ) : null}
                </div>

                {canManageTask && attachResourceOpen ? (
                  <div className="mt-4 rounded-[1.5rem] border border-border-default bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="max-w-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          LessonResources
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-text-primary">
                          Đính kèm tài nguyên đã có
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          Tìm trực tiếp từ bảng tài nguyên hiện có trong database.
                          Nếu một resource đang thuộc task khác, thao tác đính kèm
                          sẽ chuyển nó sang task hiện tại.
                        </p>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {resourceOptionsSummary}
                      </p>
                    </div>

                    <div className="mt-4 gap-3">
                      <label className="flex flex-col gap-1 text-sm text-text-secondary">
                        <span>Tìm tài nguyên</span>
                        <input
                          type="text"
                          value={resourceSearch}
                          onChange={(event) => setResourceSearch(event.target.value)}
                          placeholder="Tìm theo tiêu đề hoặc link tài nguyên…"
                          className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        />
                      </label>
                    </div>

                    <div className="mt-4 space-y-3">
                      {isResourceOptionsError ? (
                        <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-surface/80 px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-text-primary">
                            Không tải được tài nguyên để đính kèm
                          </p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">
                            {getErrorMessage(
                              resourceOptionsError,
                              "Đã có lỗi khi tải dữ liệu từ bảng LessonResources.",
                            )}
                          </p>
                          <button
                            type="button"
                            onClick={() => void refetchResourceOptions()}
                            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            Tải lại danh sách
                          </button>
                        </div>
                      ) : resourceOptions.length > 0 ? (
                        resourceOptions.map((resource) => {
                          const actionLabel = resource.lessonTaskId
                            ? "Chuyển sang task này"
                            : "Đính kèm vào task";
                          const relationLabel = resource.lessonTaskId
                            ? `Đang thuộc: ${resource.lessonTaskTitle ?? "Task khác"}`
                            : "Chưa gắn task";
                          const isPendingCurrent =
                            attachExistingResourceMutation.isPending &&
                            attachExistingResourceMutation.variables?.resourceId ===
                            resource.id;

                          return (
                            <div
                              key={resource.id}
                              className="rounded-[1.35rem] border border-border-default bg-bg-surface px-4 py-4 shadow-sm"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <button
                                  type="button"
                                  onClick={() => openEditResource(resource.id)}
                                  className="min-w-0 flex-1 rounded-[1.2rem] text-left transition-colors hover:bg-bg-secondary/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-text-primary">
                                      {resource.title ?? resource.resourceLink}
                                    </p>
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${resource.lessonTaskId
                                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                        : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                        }`}
                                    >
                                      {relationLabel}
                                    </span>
                                  </div>
                                  <span className="mt-2 block truncate text-sm text-primary transition-colors hover:text-primary-hover">
                                    {resource.resourceLink}
                                  </span>

                                  {resource.tags.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {resource.tags.slice(0, 4).map((tag) => (
                                        <span
                                          key={`${resource.id}-${tag}`}
                                          className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleAttachExistingResource(resource)}
                                  disabled={attachExistingResourceMutation.isPending}
                                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
                                >
                                  {isPendingCurrent ? "Đang đính kèm…" : actionLabel}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-surface/70 px-4 py-8 text-sm text-text-muted">
                          {deferredResourceSearch
                            ? "Không có tài nguyên nào khớp tìm kiếm hiện tại."
                            : "Chưa có gợi ý phù hợp ngoài task này. Bạn vẫn có thể tạo tài nguyên mới ngay bên cạnh."}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {task.resourcePreview.length > 0 ? (
                    task.resourcePreview.map((resource) => (
                      <article
                        key={resource.id}
                        className="rounded-[1.35rem] border border-border-default bg-bg-secondary/45 px-4 py-4 transition-colors hover:bg-bg-secondary/65"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          {canManageTask ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditResource(resource.id)}
                                className="group min-w-0 flex-1 rounded-[1.1rem] px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                              >
                                <span className="block truncate text-sm font-medium text-text-primary">
                                  {resource.title ?? resource.resourceLink}
                                </span>
                                <span className="mt-2 block truncate text-sm text-primary transition-colors group-hover:text-primary-hover">
                                  {resource.resourceLink}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDetachResource(resource.id)}
                                disabled={
                                  detachResourceMutation.isPending ||
                                  updateResourceMutation.isPending
                                }
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60 sm:shrink-0"
                              >
                                {detachResourceMutation.isPending &&
                                  detachResourceMutation.variables === resource.id
                                  ? "Đang gỡ…"
                                  : "Gỡ khỏi task"}
                              </button>
                            </>
                          ) : (
                            <div className="min-w-0 flex-1 px-1 py-1">
                              <span className="block truncate text-sm font-medium text-text-primary">
                                {resource.title ?? resource.resourceLink}
                              </span>
                              <span className="mt-2 block truncate text-sm text-primary">
                                {resource.resourceLink}
                              </span>
                            </div>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1.35rem] border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                      <p>Chưa có tài nguyên nào gắn với công việc này.</p>
                      {canCreateResource ? (
                        <>
                          {canManageTask ? (
                            <button
                              type="button"
                              onClick={() => setAttachResourceOpen(true)}
                              className="mt-4 mr-2 inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            >
                              Đính kèm từ DB
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setCreateResourceOpen(true)}
                            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            Tạo tài nguyên đầu tiên
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {task ? (
        <>
          {canManageTask ? (
            <LessonTaskFormPopup
              key={`task-detail-${task.id}-${editPopupOpen ? "open" : "closed"}`}
              open={editPopupOpen}
              mode="edit"
              initialData={task}
              isSubmitting={updateTaskMutation.isPending}
              onClose={() => {
                if (updateTaskMutation.isPending) return;
                setEditPopupOpen(false);
              }}
              onSubmit={handleSubmit}
            />
          ) : null}
          <LessonOutputFormPopup
            open={createOutputOpen}
            mode="create"
            task={{
              id: task.id,
              title: task.title,
            }}
            hideStaffFields={participantMode}
            forceSharedLayout={participantMode}
            allowTasklessOutput={false}
            allowPaymentStatusEdit={!participantMode}
            isSubmitting={createOutputMutation.isPending}
            onClose={() => {
              if (createOutputMutation.isPending) return;
              setCreateOutputOpen(false);
            }}
            onSubmit={handleCreateOutput}
          />
          {canCreateResource ? (
            <LessonResourceFormPopup
              open={createResourceOpen}
              mode="create"
              linkedTask={{
                id: task.id,
                title: task.title,
              }}
              isSubmitting={createResourceMutation.isPending}
              onClose={() => {
                if (createResourceMutation.isPending) return;
                setCreateResourceOpen(false);
              }}
              onSubmit={handleCreateResource}
            />
          ) : null}
          {canOpenOutputPopup ? (
            <LessonOutputQuickPopup
              open={Boolean(selectedOutputId)}
              outputId={selectedOutputId}
              showParentTaskBanner={!participantMode}
              hideStaffFields={participantMode}
              showStaffSummary={!participantMode}
              forceSharedLayout={participantMode}
              allowTasklessOutput={false}
              allowDelete={canDeleteInPage}
              allowPaymentStatusEdit={!participantMode}
              allowCostEdit={!participantMode}
              relatedTaskIds={[task.id]}
              onClose={() => setSelectedOutputId(null)}
            />
          ) : null}
          {canManageTask ? (
            <>
              <LessonResourceFormPopup
                key={`task-resource-edit-${selectedResourceId ?? "empty"}-${resourceDetailQuery.data?.updatedAt ?? "loading"}`}
                open={editResourceOpen}
                mode="edit"
                initialData={resourceDetailQuery.data ?? null}
                isSubmitting={updateResourceMutation.isPending}
                isLoading={
                  editResourceOpen &&
                  (resourceDetailQuery.isLoading || resourceDetailQuery.isFetching)
                }
                isError={resourceDetailQuery.isError}
                errorMessage={getErrorMessage(
                  resourceDetailQuery.error,
                  "Không tải được tài nguyên.",
                )}
                onRetry={() => void resourceDetailQuery.refetch()}
                onClose={() => {
                  if (updateResourceMutation.isPending) return;
                  setEditResourceOpen(false);
                  setSelectedResourceId(null);
                }}
                onSubmit={handleUpdateResource}
              />
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function AdminLessonTaskDetailPage() {
  return <LessonTaskDetailPage />;
}
