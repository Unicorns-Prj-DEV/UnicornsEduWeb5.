"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  useDeferredValue,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react";
import { toast } from "sonner";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import type {
  CreateLessonTaskPayload,
  LessonTaskItem,
  LessonTaskPriority,
  LessonTaskStaffOption,
  LessonTaskStatus,
  LessonUpsertMode,
} from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import {
  formatLessonStaffRoleLabel,
  formatLessonStaffStatusLabel,
  LESSON_TASK_PRIORITY_LABELS,
  LESSON_TASK_STATUS_LABELS,
} from "./lessonTaskUi";

type Props = {
  open: boolean;
  mode: LessonUpsertMode;
  initialData?: LessonTaskItem | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLessonTaskPayload) => Promise<void> | void;
};

const STATUS_OPTIONS: { value: LessonTaskStatus; label: string }[] = [
  {
    value: "pending",
    label: LESSON_TASK_STATUS_LABELS.pending,
  },
  {
    value: "in_progress",
    label: LESSON_TASK_STATUS_LABELS.in_progress,
  },
  {
    value: "completed",
    label: LESSON_TASK_STATUS_LABELS.completed,
  },
  {
    value: "cancelled",
    label: LESSON_TASK_STATUS_LABELS.cancelled,
  },
];

const PRIORITY_OPTIONS: { value: LessonTaskPriority; label: string }[] = [
  {
    value: "low",
    label: LESSON_TASK_PRIORITY_LABELS.low,
  },
  {
    value: "medium",
    label: LESSON_TASK_PRIORITY_LABELS.medium,
  },
  {
    value: "high",
    label: LESSON_TASK_PRIORITY_LABELS.high,
  },
];

function getPopupTitle(mode: LessonUpsertMode) {
  return mode === "create" ? "Thêm công việc" : "Chỉnh sửa công việc";
}

function mapTaskStaffOption(
  value:
    | LessonTaskItem["createdByStaff"]
    | LessonTaskItem["assignees"][number]
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  return {
    id: value.id,
    fullName: value.fullName,
    roles: value.roles,
    status: value.status,
  } satisfies LessonTaskStaffOption;
}

function StaffSelectionCard({
  staff,
}: {
  staff: LessonTaskStaffOption;
}) {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-secondary/70 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">
          {staff.fullName}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          {formatLessonStaffRoleLabel(staff.roles)}
        </p>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {formatLessonStaffStatusLabel(staff.status)}
      </p>
    </div>
  );
}

export default function LessonTaskFormPopup({
  open,
  mode,
  initialData,
  isSubmitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(() => initialData?.title ?? "");
  const [description, setDescription] = useState(
    () => initialData?.description ?? "",
  );
  const [status, setStatus] = useState<LessonTaskStatus>(
    () => initialData?.status ?? "pending",
  );
  const [priority, setPriority] = useState<LessonTaskPriority>(
    () => initialData?.priority ?? "medium",
  );
  const [dueDate, setDueDate] = useState(() => initialData?.dueDate ?? "");
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedCreator, setSelectedCreator] =
    useState<LessonTaskStaffOption | null>(() =>
      mapTaskStaffOption(initialData?.createdByStaff),
    );
  const syncedAssignees = useMemo(
    () =>
      (initialData?.assignees ?? [])
        .map((assignee) => mapTaskStaffOption(assignee))
        .filter(
          (assignee): assignee is LessonTaskStaffOption => assignee !== null,
        ),
    [initialData?.assignees],
  );

  const deferredStaffSearch = useDeferredValue(staffSearch.trim());

  const { data: staffOptions = [], isFetching: isStaffOptionsFetching } =
    useQuery<LessonTaskStaffOption[]>({
      queryKey: ["lesson", "task-staff-options", deferredStaffSearch],
      queryFn: () =>
        lessonApi.searchLessonTaskStaffOptions({
          search: deferredStaffSearch || undefined,
          limit: 3,
        }),
      enabled: open,
      placeholderData: keepPreviousData,
    });

  const resultSummary = useMemo(() => {
    if (isStaffOptionsFetching) {
      return "Đang tìm nhân sự giáo án…";
    }

    if (staffOptions.length === 0) {
      return deferredStaffSearch
        ? "Không tìm thấy nhân sự phù hợp với từ khóa hiện tại."
        : "Chưa có gợi ý nhân sự giáo án.";
    }

    return deferredStaffSearch
      ? `Có ${staffOptions.length} kết quả gần nhất cho tìm kiếm hiện tại.`
      : "Gợi ý nhanh 3 nhân sự giáo án đầu tiên theo hệ thống.";
  }, [deferredStaffSearch, isStaffOptionsFetching, staffOptions.length]);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Tên công việc là bắt buộc.");
      return;
    }

    await onSubmit({
      title: trimmedTitle,
      description: description.trim() || null,
      status,
      priority,
      dueDate: dueDate.trim() || null,
      createdByStaffId: selectedCreator?.id ?? null,
    });
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-task-form-title"
        className="fixed inset-x-3 top-1/2 z-50 max-h-[90vh] -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-xl sm:left-1/2 sm:w-full sm:max-w-4xl sm:-translate-x-1/2 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Task Desk
            </p>
            <h2
              id="lesson-task-form-title"
              className="mt-2 text-xl font-semibold text-text-primary text-balance"
            >
              {getPopupTitle(mode)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Chỉnh nội dung task và người chịu trách nhiệm. Danh sách nhân sự
              thực hiện sẽ tự đồng bộ từ các output con của task này.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng popup công việc"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="flex flex-col gap-4 ">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Tên công việc</span>
                  <input
                    type="text"
                    name="title"
                    autoComplete="off"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ví dụ: Soạn outline buổi 1…"
                    className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Trạng thái</span>
                  <UpgradedSelect
                    name="status"
                    value={status}
                    onValueChange={(value) => setStatus(value as LessonTaskStatus)}
                    options={STATUS_OPTIONS}
                    ariaLabel="Trạng thái công việc"
                    placeholder="Chọn trạng thái"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Ưu tiên</span>
                  <UpgradedSelect
                    name="priority"
                    value={priority}
                    onValueChange={(value) =>
                      setPriority(value as LessonTaskPriority)
                    }
                    options={PRIORITY_OPTIONS}
                    ariaLabel="Mức ưu tiên công việc"
                    placeholder="Chọn mức ưu tiên"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Hạn xử lý</span>
                  <input
                    type="date"
                    name="dueDate"
                    autoComplete="off"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Mô tả</span>
                  <textarea
                    name="description"
                    autoComplete="off"
                    rows={6}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Ghi rõ checklist, kỳ vọng đầu ra hoặc ghi chú handoff…"
                    className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-[1.5rem] border border-border-default bg-bg-secondary/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      Người chịu trách nhiệm
                    </p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      Nếu để trống, backend sẽ dùng hồ sơ nhân sự của người thao
                      tác khi có thể map được.
                    </p>
                  </div>
                  {selectedCreator ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCreator(null)}
                      className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Bỏ chọn
                    </button>
                  ) : null}
                </div>

                <div className="mt-3">
                  {selectedCreator ? (
                    <StaffSelectionCard staff={selectedCreator} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface px-4 py-5 text-sm text-text-muted">
                      Chưa gán người phụ trách cụ thể.
                    </div>
                  )}
                </div>
              </section>


            </div>
          </section>

          <section className="rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Tìm nhân sự giáo án
                </p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Chọn người chịu trách nhiệm cho task. Phần nhân sự thực hiện
                  không còn chỉnh tay tại đây.
                </p>
              </div>
              <p
                className="text-xs text-text-muted"
                aria-live="polite"
              >
                {resultSummary}
              </p>
            </div>

            <div className="mt-4">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Tìm theo họ tên</span>
                <input
                  type="search"
                  name="staffSearch"
                  autoComplete="off"
                  value={staffSearch}
                  onChange={(event) => setStaffSearch(event.target.value)}
                  placeholder="Nhập tên nhân sự giáo án…"
                  className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3">
              {staffOptions.length > 0 ? (
                staffOptions.map((staff) => {
                  const isCreator = selectedCreator?.id === staff.id;

                  return (
                    <article
                      key={staff.id}
                      className="rounded-2xl border border-border-default bg-bg-secondary/50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">
                            {staff.fullName}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {formatLessonStaffRoleLabel(staff.roles)}
                          </p>
                          <p className="mt-2 text-xs text-text-muted">
                            {formatLessonStaffStatusLabel(staff.status)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCreator(staff)}
                            className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${isCreator
                              ? "border border-primary/25 bg-primary/12 text-primary"
                              : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-tertiary"
                              }`}
                          >
                            {isCreator
                              ? "Đang phụ trách"
                              : "Chọn phụ trách"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                  {deferredStaffSearch
                    ? "Không có kết quả phù hợp. Thử đổi từ khóa ngắn hơn hoặc đúng họ tên hơn."
                    : "Không có gợi ý nhân sự giáo án ở thời điểm hiện tại."}
                </div>
              )}
            </div>
          </section>

          <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              {isSubmitting
                ? "Đang lưu…"
                : mode === "create"
                  ? "Tạo công việc"
                  : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
