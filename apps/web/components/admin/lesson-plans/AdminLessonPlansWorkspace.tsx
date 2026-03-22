"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateLessonResourcePayload,
  CreateLessonTaskPayload,
  LessonListMeta,
  LessonOverviewResponse,
  LessonResourceItem,
  LessonTabId,
  LessonTaskItem,
  LessonUpsertMode,
} from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import LessonDeleteConfirmPopup from "./LessonDeleteConfirmPopup";
import LessonOverviewSkeleton from "./LessonOverviewSkeleton";
import LessonResourceFormPopup from "./LessonResourceFormPopup";
import LessonTaskFormPopup from "./LessonTaskFormPopup";
import LessonExercisesTab from "./LessonExercisesTab";
import LessonWorkTab from "./LessonWorkTab";
import {
  formatLessonDateOnly,
  LESSON_TASK_PRIORITY_LABELS,
  LESSON_TASK_STATUS_LABELS,
  lessonTaskPriorityChipClass,
  lessonTaskStatusChipClass,
} from "./lessonTaskUi";

const TAB_LABELS: Record<LessonTabId, string> = {
  overview: "Tổng quan",
  work: "Công việc",
  exercises: "Bài tập",
};

const RESOURCE_PAGE_SIZE = 6;
const TASK_PAGE_SIZE = 6;

type DeleteTarget =
  | { kind: "resource"; id: string; label: string }
  | { kind: "task"; id: string; label: string }
  | null;

function normalizeTab(value: string | null): LessonTabId {
  if (value === "overview" || value === "work" || value === "exercises") {
    return value;
  }

  return "overview";
}

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-5 py-10 text-center">
      <p className="text-base font-semibold text-text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
        {description}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function TablePagination({
  label,
  meta,
  isPending = false,
  onPageChange,
}: {
  label: string;
  meta: LessonListMeta;
  isPending?: boolean;
  onPageChange: (page: number) => void;
}) {
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to =
    meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-text-secondary">
          {label}: {from}-{to} / {meta.total}
        </p>
        {isPending ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Đang chuyển trang
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1 || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trước
        </button>
        <span className="rounded-xl border border-border-default bg-bg-secondary px-3 py-2 text-sm font-medium text-text-secondary">
          Trang {meta.page}/{meta.totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function ListTableSkeleton({
  rows = 3,
  variant,
}: {
  rows?: number;
  variant: "resource" | "task";
}) {
  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border-default">
      <div className="border-b border-border-default bg-bg-secondary px-4 py-3">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`header-${variant}-${index}`}
              className="h-4 animate-pulse rounded-full bg-bg-tertiary"
            />
          ))}
        </div>
      </div>

      <div className="divide-y divide-border-default">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={`${variant}-row-${index}`}
            className="grid gap-4 bg-bg-surface px-4 py-4 lg:grid-cols-12"
          >
            <div
              className={
                variant === "resource" ? "lg:col-span-3" : "lg:col-span-4"
              }
            >
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-bg-tertiary" />
            </div>

            {variant === "resource" ? (
              <>
                <div className="space-y-2 lg:col-span-5">
                  <div className="h-3 w-full animate-pulse rounded-full bg-bg-tertiary/80" />
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-bg-tertiary/65" />
                </div>
                <div className="flex flex-wrap gap-2 lg:col-span-2">
                  <div className="h-7 w-16 animate-pulse rounded-full bg-bg-tertiary/80" />
                  <div className="h-7 w-20 animate-pulse rounded-full bg-bg-tertiary/65" />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 lg:col-span-3">
                  <div className="h-7 w-24 animate-pulse rounded-full bg-bg-tertiary/80" />
                  <div className="h-7 w-20 animate-pulse rounded-full bg-bg-tertiary/65" />
                </div>

                <div className="space-y-3 lg:col-span-3">
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-bg-tertiary/80" />
                  <div className="h-3 w-3/5 animate-pulse rounded-full bg-bg-tertiary/65" />
                </div>
              </>
            )}

            <div className="flex items-start justify-end gap-2 lg:col-span-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-tertiary/70" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-tertiary/55" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminLessonPlansWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const activeTab = normalizeTab(searchParams.get("tab"));
  const resourcePage = normalizePositiveInt(searchParams.get("resourcePage"));
  const taskPage = normalizePositiveInt(searchParams.get("taskPage"));

  const [resourcePopupOpen, setResourcePopupOpen] = useState(false);
  const [resourceMode, setResourceMode] = useState<LessonUpsertMode>("create");
  const [selectedResource, setSelectedResource] =
    useState<LessonResourceItem | null>(null);

  const [taskPopupOpen, setTaskPopupOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<LessonUpsertMode>("create");
  const [selectedTask, setSelectedTask] = useState<LessonTaskItem | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useQuery<LessonOverviewResponse>({
      queryKey: ["lesson", "overview", resourcePage, taskPage],
      queryFn: () =>
        lessonApi.getLessonOverview({
          resourcePage,
          resourceLimit: RESOURCE_PAGE_SIZE,
          taskPage,
          taskLimit: TASK_PAGE_SIZE,
        }),
      placeholderData: (previousData) => previousData,
    });

  const resources = useMemo(() => data?.resources ?? [], [data]);
  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const isResourceListPending =
    !!data && isFetching && data.resourcesMeta.page !== resourcePage;
  const isTaskListPending = !!data && isFetching && data.tasksMeta.page !== taskPage;

  const invalidateOverview = async () => {
    await queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] });
  };

  const createResourceMutation = useMutation({
    mutationFn: lessonApi.createLessonResource,
    onSuccess: async () => {
      await invalidateOverview();
      toast.success("Đã thêm tài nguyên giáo án.");
      setResourcePopupOpen(false);
      setSelectedResource(null);
      setResourceMode("create");
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể tạo tài nguyên."));
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
    onSuccess: async () => {
      await invalidateOverview();
      toast.success("Đã cập nhật tài nguyên giáo án.");
      setResourcePopupOpen(false);
      setSelectedResource(null);
      setResourceMode("create");
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật tài nguyên."),
      );
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: lessonApi.deleteLessonResource,
    onSuccess: async () => {
      await invalidateOverview();
      toast.success("Đã xóa tài nguyên giáo án.");
      setDeleteTarget(null);
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể xóa tài nguyên."));
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: lessonApi.createLessonTask,
    onSuccess: async () => {
      await invalidateOverview();
      toast.success("Đã thêm công việc giáo án.");
      setTaskPopupOpen(false);
      setSelectedTask(null);
      setTaskMode("create");
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể tạo công việc."));
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateLessonTaskPayload;
    }) => lessonApi.updateLessonTask(id, payload),
    onSuccess: async () => {
      await invalidateOverview();
      toast.success("Đã cập nhật công việc giáo án.");
      setTaskPopupOpen(false);
      setSelectedTask(null);
      setTaskMode("create");
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật công việc."),
      );
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: lessonApi.deleteLessonTask,
    onSuccess: async () => {
      await invalidateOverview();
      toast.success("Đã xóa công việc giáo án.");
      setDeleteTarget(null);
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể xóa công việc."));
    },
  });

  const syncTabToUrl = (tab: LessonTabId) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", tab);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const setListPage = (key: "resourcePage" | "taskPage", page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set(key, String(Math.max(1, page)));
    params.set("tab", activeTab);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const buildTaskDetailHref = (taskId: string) => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    params.set("resourcePage", String(resourcePage));
    params.set("taskPage", String(taskPage));
    return `/admin/lesson-plans/tasks/${encodeURIComponent(taskId)}?${params.toString()}`;
  };

  const openCreateResource = () => {
    setResourceMode("create");
    setSelectedResource(null);
    setResourcePopupOpen(true);
  };

  const openEditResource = (resource: LessonResourceItem) => {
    setResourceMode("edit");
    setSelectedResource(resource);
    setResourcePopupOpen(true);
  };

  const openCreateTask = () => {
    setTaskMode("create");
    setSelectedTask(null);
    setTaskPopupOpen(true);
  };

  const openEditTask = (task: LessonTaskItem) => {
    setTaskMode("edit");
    setSelectedTask(task);
    setTaskPopupOpen(true);
  };

  const handleResourceSubmit = async (payload: CreateLessonResourcePayload) => {
    if (resourceMode === "create") {
      await createResourceMutation.mutateAsync(payload);
      return;
    }

    if (!selectedResource) {
      toast.error("Không tìm thấy tài nguyên để cập nhật.");
      return;
    }

    await updateResourceMutation.mutateAsync({
      id: selectedResource.id,
      payload,
    });
  };

  const handleTaskSubmit = async (payload: CreateLessonTaskPayload) => {
    if (taskMode === "create") {
      await createTaskMutation.mutateAsync(payload);
      return;
    }

    if (!selectedTask) {
      toast.error("Không tìm thấy công việc để cập nhật.");
      return;
    }

    await updateTaskMutation.mutateAsync({
      id: selectedTask.id,
      payload,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.kind === "resource") {
      await deleteResourceMutation.mutateAsync(deleteTarget.id);
      return;
    }

    await deleteTaskMutation.mutateAsync(deleteTarget.id);
  };

  const isDeletePending =
    deleteResourceMutation.isPending || deleteTaskMutation.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        {/* Hero: giống pattern header trang admin */}
        <section className="relative mb-4 overflow-visible rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div
            className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 left-10 size-28 rounded-full bg-warning/10 blur-2xl"
            aria-hidden
          />

          <div className="relative min-w-0">
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
              Giáo Án
            </h1>
          </div>
        </section>

        {/* Thanh 3 tab — full width, pill; mỗi tab chia đều để dễ bấm và nhìn rõ */}
        <div className="mb-5 w-full min-w-0">
          <div
            className="flex w-full min-w-0 rounded-full bg-bg-secondary p-1 sm:p-1.5"
            role="tablist"
            aria-label="Tổng quan, Công việc hoặc Giáo án"
          >
            {(Object.keys(TAB_LABELS) as LessonTabId[]).map((tabId) => {
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  id={`lesson-tab-${tabId}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`lesson-panel-${tabId}`}
                  onClick={() => syncTabToUrl(tabId)}
                  className={`min-h-12 flex-1 min-w-0 rounded-full px-3 py-2.5 text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface sm:min-h-14 sm:px-6 sm:py-3 sm:text-base ${isActive
                    ? "bg-bg-surface text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                    }`}
                >
                  {TAB_LABELS[tabId]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {activeTab === "overview" ? (
            <section
              id="lesson-panel-overview"
              role="tabpanel"
              aria-labelledby="lesson-tab-overview"
              className="space-y-6"
            >
              {isLoading && !data ? (
                <LessonOverviewSkeleton />
              ) : isError ? (
                <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                  <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
                    <p className="text-base font-semibold text-text-primary">
                      Không tải được dữ liệu giáo án.
                    </p>
                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                      {getErrorMessage(error, "Đã có lỗi khi tải tab Tổng quan.")}
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetch()}
                      className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Tải lại
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <section
                    className="rounded-[1.75rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5"
                    aria-busy={isResourceListPending}
                  >
                    <div className="flex flex-col gap-4 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
                          Tài nguyên giáo án
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border-default bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary">
                          {data?.resourcesMeta.total ?? resources.length} tài
                          nguyên
                        </span>
                        {isResourceListPending ? (
                          <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                            Đang đổi trang
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={openCreateResource}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Thêm tài nguyên
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      {isResourceListPending ? (
                        <ListTableSkeleton variant="resource" />
                      ) : resources.length === 0 ? (
                        <EmptyState
                          title="Chưa có tài nguyên nào trong tab Tổng quan"
                          description="Thêm tài liệu gốc, link lecture note, bộ đề, hoặc tài nguyên định hướng để team có một thư viện chung ngay tại route giáo án."
                          actionLabel="Tạo tài nguyên đầu tiên"
                          onAction={openCreateResource}
                        />
                      ) : (
                        <div className="overflow-hidden rounded-[1.4rem] border border-border-default">
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-left">
                              <thead className="bg-bg-secondary">
                                <tr className="text-sm text-text-secondary">
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Tài nguyên
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Link
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Tag
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-20 px-4 py-3 text-right"
                                  >
                                    <span className="sr-only">Thao tác</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {resources.map((resource) => (
                                  <tr
                                    key={resource.id}
                                    className="group border-t border-border-default bg-bg-surface align-top transition-colors hover:bg-bg-secondary/50"
                                  >
                                    <td className="px-4 py-4">
                                      <div className="min-w-[12rem]">
                                        <p className="font-medium text-text-primary">
                                          {resource.title ??
                                            "Tài nguyên chưa đặt tên"}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <a
                                        href={resource.resourceLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex max-w-[18rem] items-center gap-2 text-sm text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                      >
                                        <span className="truncate">
                                          {resource.resourceLink}
                                        </span>
                                      </a>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex min-w-[10rem] flex-wrap gap-2">
                                        {resource.tags.length > 0 ? (
                                          resource.tags.map((tag) => (
                                            <span
                                              key={tag}
                                              className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary"
                                            >
                                              {tag}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-sm text-text-muted">
                                            —
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openEditResource(resource)
                                          }
                                          className="rounded p-1.5 text-text-muted transition-colors duration-200 hover:bg-primary/12 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                                          aria-label={`Sửa tài nguyên ${resource.title?.trim() || ""}`}
                                          title="Sửa tài nguyên"
                                        >
                                          <svg
                                            className="size-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteTarget({
                                              kind: "resource",
                                              id: resource.id,
                                              label:
                                                resource.title ??
                                                "tài nguyên chưa đặt tên",
                                            })
                                          }
                                          className="rounded p-1.5 text-text-muted transition-colors duration-200 hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                                          aria-label={`Xóa tài nguyên ${resource.title?.trim() || ""}`}
                                          title="Xóa tài nguyên"
                                        >
                                          <svg
                                            className="size-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-4 py-4">
                            <TablePagination
                              label="Tài nguyên"
                              isPending={isResourceListPending}
                              meta={
                                data?.resourcesMeta ?? {
                                  total: resources.length,
                                  page: 1,
                                  limit: RESOURCE_PAGE_SIZE,
                                  totalPages: 1,
                                }
                              }
                              onPageChange={(page) =>
                                setListPage("resourcePage", page)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <section
                    className="rounded-[1.75rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5"
                    aria-busy={isTaskListPending}
                  >
                    <div className="flex flex-col gap-4 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
                          Công việc giáo án
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border-default bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary">
                          {data?.tasksMeta.total ?? tasks.length} công việc
                        </span>
                        {isTaskListPending ? (
                          <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                            Đang đổi trang
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={openCreateTask}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Thêm công việc
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      {isTaskListPending ? (
                        <ListTableSkeleton variant="task" />
                      ) : tasks.length === 0 ? (
                        <EmptyState
                          title="Chưa có công việc nào trong tab Tổng quan"
                          description="Tạo task ngay tại đây để chốt backlog soạn bài, biên tập tài nguyên, hoặc các checklist cần xử lý cho route giáo án."
                          actionLabel="Tạo công việc đầu tiên"
                          onAction={openCreateTask}
                        />
                      ) : (
                        <div className="overflow-hidden rounded-[1.4rem] border border-border-default">
                          <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-left">
                              <thead className="bg-bg-secondary">
                                <tr className="text-sm text-text-secondary">
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Công việc
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Trạng thái
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Ưu tiên
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Hạn xử lý
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-4 py-3 font-medium"
                                  >
                                    Phụ trách
                                  </th>
                                  <th
                                    scope="col"
                                    className="w-20 px-4 py-3 text-right"
                                  >
                                    <span className="sr-only">Thao tác</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {tasks.map((task) => (
                                  <tr
                                    key={task.id}
                                    role="button"
                                    tabIndex={0}
                                    className="group cursor-pointer border-t border-border-default bg-bg-surface align-top transition-colors hover:bg-bg-secondary/50 focus-within:bg-bg-secondary/50"
                                    onClick={() =>
                                      router.push(buildTaskDetailHref(task.id))
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        router.push(buildTaskDetailHref(task.id));
                                      }
                                    }}
                                    aria-label={`Xem chi tiết công việc ${task.title?.trim() || ""}`}
                                  >
                                    <td className="px-4 py-4">
                                      <div className="min-w-[12rem]">
                                        <p className="font-medium text-text-primary">
                                          {task.title ?? "Công việc chưa đặt tên"}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskStatusChipClass(
                                          task.status,
                                        )}`}
                                      >
                                        {LESSON_TASK_STATUS_LABELS[task.status]}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskPriorityChipClass(
                                          task.priority,
                                        )}`}
                                      >
                                        {LESSON_TASK_PRIORITY_LABELS[task.priority]}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-text-secondary">
                                      {formatLessonDateOnly(task.dueDate)}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-text-secondary">
                                      {task.createdByStaff?.fullName ??
                                        "Chưa ghi nhận"}
                                    </td>
                                    <td
                                      className="px-4 py-4"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                                        <button
                                          type="button"
                                          onClick={() => openEditTask(task)}
                                          className="rounded p-1.5 text-text-muted transition-colors duration-200 hover:bg-primary/12 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                                          aria-label={`Sửa công việc ${task.title?.trim() || ""}`}
                                          title="Sửa công việc"
                                        >
                                          <svg
                                            className="size-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeleteTarget({
                                              kind: "task",
                                              id: task.id,
                                              label:
                                                task.title ??
                                                "công việc chưa đặt tên",
                                            })
                                          }
                                          className="rounded p-1.5 text-text-muted transition-colors duration-200 hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                                          aria-label={`Xóa công việc ${task.title?.trim() || ""}`}
                                          title="Xóa công việc"
                                        >
                                          <svg
                                            className="size-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-4 py-4">
                            <TablePagination
                              label="Công việc"
                              isPending={isTaskListPending}
                              meta={
                                data?.tasksMeta ?? {
                                  total: tasks.length,
                                  page: 1,
                                  limit: TASK_PAGE_SIZE,
                                  totalPages: 1,
                                }
                              }
                              onPageChange={(page) =>
                                setListPage("taskPage", page)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </section>
          ) : activeTab === "work" ? (
            <LessonWorkTab />
          ) : (
            <LessonExercisesTab />
          )}
        </div>
      </div>

      <LessonResourceFormPopup
        key={`resource-${resourceMode}-${selectedResource?.id ?? "new"}`}
        open={resourcePopupOpen}
        mode={resourceMode}
        initialData={selectedResource}
        isSubmitting={
          createResourceMutation.isPending || updateResourceMutation.isPending
        }
        onClose={() => {
          if (
            createResourceMutation.isPending ||
            updateResourceMutation.isPending
          )
            return;
          setResourcePopupOpen(false);
          setSelectedResource(null);
          setResourceMode("create");
        }}
        onSubmit={handleResourceSubmit}
      />

      <LessonTaskFormPopup
        key={`task-${taskMode}-${selectedTask?.id ?? "new"}`}
        open={taskPopupOpen}
        mode={taskMode}
        initialData={selectedTask}
        isSubmitting={
          createTaskMutation.isPending || updateTaskMutation.isPending
        }
        onClose={() => {
          if (createTaskMutation.isPending || updateTaskMutation.isPending)
            return;
          setTaskPopupOpen(false);
          setSelectedTask(null);
          setTaskMode("create");
        }}
        onSubmit={handleTaskSubmit}
      />

      <LessonDeleteConfirmPopup
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === "resource"
            ? "Xóa tài nguyên giáo án?"
            : "Xóa công việc giáo án?"
        }
        description={
          deleteTarget
            ? `Thao tác này sẽ xóa ${deleteTarget.kind === "resource" ? "tài nguyên" : "công việc"} “${deleteTarget.label}”. Dữ liệu sẽ biến mất khỏi tab Tổng quan ngay sau khi xác nhận.`
            : ""
        }
        confirmLabel={
          deleteTarget?.kind === "resource" ? "Xóa tài nguyên" : "Xóa công việc"
        }
        onClose={() => {
          if (isDeletePending) return;
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        isSubmitting={isDeletePending}
      />
    </div>
  );
}
