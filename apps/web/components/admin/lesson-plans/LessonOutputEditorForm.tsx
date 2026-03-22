"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import type {
  CreateLessonOutputPayload,
  LessonOutputItem,
  LessonOutputStaffOption,
  LessonOutputStatus,
  LessonUpsertMode,
} from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import {
  formatLessonStaffRoleLabel,
  formatLessonStaffStatusLabel,
  LESSON_OUTPUT_STATUS_LABELS,
  lessonOutputStatusChipClass,
} from "./lessonTaskUi";

type TaskContext = {
  id: string;
  title: string | null;
} | null;

type Props = {
  mode: LessonUpsertMode;
  initialData?: LessonOutputItem | null;
  initialTask?: TaskContext;
  /** Khi `false`, ẩn khối “Parent Task” (dùng tab Công việc — chọn task ở ngoài). */
  showParentTaskBanner?: boolean;
  /** Khi `true`, ẩn toàn bộ khối gán nhân sự (tab Công việc — Thêm bài mới). */
  hideStaffFields?: boolean;
  /** Khi `true`, cho phép submit không có `lessonTaskId` (gửi `null`). */
  allowTasklessOutput?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (payload: CreateLessonOutputPayload) => Promise<void> | void;
  submitLabel?: string;
};

const STATUS_OPTIONS: { value: LessonOutputStatus; label: string }[] = [
  {
    value: "pending",
    label: LESSON_OUTPUT_STATUS_LABELS.pending,
  },
  {
    value: "completed",
    label: LESSON_OUTPUT_STATUS_LABELS.completed,
  },
  {
    value: "cancelled",
    label: LESSON_OUTPUT_STATUS_LABELS.cancelled,
  },
];

function getSubmitLabel(mode: LessonUpsertMode, submitLabel?: string) {
  if (submitLabel) {
    return submitLabel;
  }

  return mode === "create" ? "Tạo output" : "Lưu thay đổi";
}

function normalizeSelectedStaff(
  value: LessonOutputItem["staff"] | null | undefined,
): LessonOutputStaffOption | null {
  if (!value) {
    return null;
  }

  return {
    id: value.id,
    fullName: value.fullName,
    roles: value.roles,
    status: value.status,
  };
}

function StaffCard({
  staff,
  onClear,
}: {
  staff: LessonOutputStaffOption;
  onClear?: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border-default bg-bg-secondary/70 p-3">
      <div className="flex items-start justify-between gap-3">
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

        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Bỏ chọn
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function LessonOutputEditorForm({
  mode,
  initialData,
  initialTask = null,
  showParentTaskBanner = true,
  hideStaffFields = false,
  allowTasklessOutput = false,
  isSubmitting = false,
  onCancel,
  onSubmit,
  submitLabel,
}: Props) {
  const lessonTaskId = initialData?.lessonTaskId ?? initialTask?.id ?? "";
  const lessonTaskTitle = initialData?.task?.title ?? initialTask?.title ?? null;
  const hasParentTask = lessonTaskId.trim().length > 0;
  const [lessonName, setLessonName] = useState(
    () => initialData?.lessonName ?? "",
  );
  const [contestUploaded, setContestUploaded] = useState(
    () => initialData?.contestUploaded ?? "",
  );
  const [date, setDate] = useState(() => initialData?.date ?? "");
  const [status, setStatus] = useState<LessonOutputStatus>(
    () => initialData?.status ?? "pending",
  );
  const [cost, setCost] = useState(() => String(initialData?.cost ?? 0));
  const [level, setLevel] = useState(() => initialData?.level ?? "");
  const [source, setSource] = useState(() => initialData?.source ?? "");
  const [originalTitle, setOriginalTitle] = useState(
    () => initialData?.originalTitle ?? "",
  );
  const [originalLink, setOriginalLink] = useState(
    () => initialData?.originalLink ?? "",
  );
  const [link, setLink] = useState(() => initialData?.link ?? "");
  const [tagsInput, setTagsInput] = useState(
    () => (initialData?.tags ?? []).join(", "),
  );
  const [staffSearch, setStaffSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<LessonOutputStaffOption | null>(
    () => normalizeSelectedStaff(initialData?.staff),
  );

  const deferredStaffSearch = useDeferredValue(staffSearch.trim());
  const parsedTags = useMemo(
    () =>
      Array.from(
        new Set(
          tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ),
    [tagsInput],
  );

  const { data: staffOptions = [], isFetching: isStaffOptionsFetching } =
    useQuery<LessonOutputStaffOption[]>({
      queryKey: ["lesson", "output-staff-options", deferredStaffSearch],
      queryFn: () =>
        lessonApi.searchLessonOutputStaffOptions({
          search: deferredStaffSearch || undefined,
          limit: 6,
        }),
      placeholderData: keepPreviousData,
    });

  const resultSummary = useMemo(() => {
    if (hideStaffFields) {
      return "";
    }
    if (isStaffOptionsFetching) {
      return "Đang tìm nhân sự…";
    }

    if (staffOptions.length === 0) {
      return deferredStaffSearch
        ? "Không có nhân sự khớp tìm kiếm."
        : "Gợi ý nhanh nhân sự khả dụng.";
    }

    return `Có ${staffOptions.length} nhân sự gần nhất cho truy vấn hiện tại.`;
  }, [
    deferredStaffSearch,
    hideStaffFields,
    isStaffOptionsFetching,
    staffOptions.length,
  ]);

  const validateOptionalUrl = (value: string, label: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return true;
    }

    try {
      const url = new URL(trimmedValue);
      if (!["http:", "https:"].includes(url.protocol)) {
        toast.error(`${label} phải bắt đầu bằng http hoặc https.`);
        return false;
      }

      return true;
    } catch {
      toast.error(`${label} không hợp lệ.`);
      return false;
    }
  };

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedLessonName = lessonName.trim();
    if (!allowTasklessOutput && !lessonTaskId.trim()) {
      toast.error("Không xác định được task cha cho lesson output.");
      return;
    }

    if (!trimmedLessonName) {
      toast.error("Tên bài là bắt buộc.");
      return;
    }

    if (!date.trim()) {
      toast.error("Ngày tạo output là bắt buộc.");
      return;
    }

    if (
      !validateOptionalUrl(originalLink, "Link gốc") ||
      !validateOptionalUrl(link, "Link output")
    ) {
      return;
    }

    const parsedCost = Number(cost.trim() || "0");
    if (!Number.isInteger(parsedCost) || parsedCost < 0) {
      toast.error("Chi phí phải là số nguyên không âm.");
      return;
    }

    const resolvedTaskId = allowTasklessOutput
      ? lessonTaskId.trim() || null
      : lessonTaskId.trim();

    await onSubmit({
      lessonTaskId: resolvedTaskId,
      lessonName: trimmedLessonName,
      originalTitle: originalTitle.trim() || null,
      source: source.trim() || null,
      originalLink: originalLink.trim() || null,
      level: level.trim() || null,
      tags: parsedTags,
      cost: parsedCost,
      date: date.trim(),
      contestUploaded: contestUploaded.trim() || null,
      link: link.trim() || null,
      staffId: hideStaffFields ? null : (selectedStaff?.id ?? null),
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {showParentTaskBanner ? (
        <section className="rounded-[1.5rem] border border-border-default bg-bg-secondary/45 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                Parent Task
              </p>
              <p className="mt-2 text-lg font-semibold text-text-primary">
                {hasParentTask
                  ? (lessonTaskTitle ?? "Task chưa đặt tên")
                  : "Chưa gắn công việc"}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {hasParentTask
                  ? `Task ID: ${lessonTaskId}`
                  : "Sản phẩm này đang được quản lý độc lập ngoài task."}
              </p>
            </div>

            <span
              className={`inline-flex h-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonOutputStatusChipClass(
                status,
              )}`}
            >
              {LESSON_OUTPUT_STATUS_LABELS[status]}
            </span>
          </div>
        </section>
      ) : null}

      <section
        className={
          hideStaffFields
            ? "space-y-4"
            : "grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]"
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
              <span>Tên bài</span>
              <input
                type="text"
                value={lessonName}
                onChange={(event) => setLessonName(event.target.value)}
                placeholder="Ví dụ: Bài 1 - Tổ hợp cơ bản"
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              <span>Contest uploaded</span>
              <input
                type="text"
                value={contestUploaded}
                onChange={(event) => setContestUploaded(event.target.value)}
                placeholder="Ví dụ: Vĩnh Phúc HSG 2024"
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              <span>Ngày</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                required
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              <span>Trạng thái</span>
              <UpgradedSelect
                name="status"
                value={status}
                onValueChange={(value) => setStatus(value as LessonOutputStatus)}
                options={STATUS_OPTIONS}
                ariaLabel="Trạng thái lesson output"
                placeholder="Chọn trạng thái"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              <span>Chi phí</span>
              <input
                type="number"
                min={0}
                step={1}
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                placeholder="0"
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              <span>Level</span>
              <input
                type="text"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                placeholder="Ví dụ: HSG tỉnh"
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              <span>Nguồn</span>
              <input
                type="text"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Ví dụ: Vĩnh Phúc HSG 2024"
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
              <span>Original title</span>
              <input
                type="text"
                value={originalTitle}
                onChange={(event) => setOriginalTitle(event.target.value)}
                placeholder="Tên bài gốc hoặc tên trong đề nguồn"
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
              <span>Link gốc</span>
              <input
                type="url"
                value={originalLink}
                onChange={(event) => setOriginalLink(event.target.value)}
                placeholder="https://..."
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
              <span>Link output</span>
              <input
                type="url"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://..."
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
              <span>Tags</span>
              <input
                type="text"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="hsg, vinh-phuc, to-hop"
                className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>
          </div>

          {parsedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-border-default bg-bg-secondary/70 p-3">
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {hideStaffFields ? null : (
          <div className="space-y-4">
            <section className="rounded-[1.5rem] border border-border-default bg-bg-secondary/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Nhân sự phụ trách output
                  </p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    Dùng để biết ai đang đứng tên output này khi rà soát tiến độ.
                  </p>
                </div>
              </div>

              <div className="mt-3">
                {selectedStaff ? (
                  <StaffCard
                    staff={selectedStaff}
                    onClear={() => setSelectedStaff(null)}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface px-4 py-5 text-sm text-text-muted">
                    Chưa gán nhân sự cho output này.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-border-default bg-bg-surface p-4 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Tìm nhân sự
                  </p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    Gắn người chịu trách nhiệm cho output ngay trong cùng flow tạo.
                  </p>
                </div>
                <p className="text-xs text-text-muted" aria-live="polite">
                  {resultSummary}
                </p>
              </div>

              <div className="mt-4">
                <label className="flex flex-col gap-1 text-sm text-text-secondary">
                  <span>Tìm theo họ tên</span>
                  <input
                    type="search"
                    value={staffSearch}
                    onChange={(event) => setStaffSearch(event.target.value)}
                    placeholder="Nhập tên nhân sự…"
                    className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3">
                {staffOptions.length > 0 ? (
                  staffOptions.map((staff) => {
                    const isSelected = selectedStaff?.id === staff.id;

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

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStaff((current) =>
                                current?.id === staff.id ? null : staff,
                              )
                            }
                            className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${isSelected
                              ? "border border-primary/25 bg-primary/12 text-primary"
                              : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-tertiary"
                              }`}
                          >
                            {isSelected ? "Đang gắn" : "Chọn cho output"}
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/40 px-4 py-8 text-sm text-text-muted">
                    Chưa có kết quả nhân sự cho tìm kiếm hiện tại.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
          >
            Hủy
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
        >
          {isSubmitting ? "Đang lưu…" : getSubmitLabel(mode, submitLabel)}
        </button>
      </div>
    </form>
  );
}
