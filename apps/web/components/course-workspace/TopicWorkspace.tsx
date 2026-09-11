"use client";

import { Suspense, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import { getFullProfile } from "@/lib/apis/auth.api";
import { authKeys, courseKeys } from "@/lib/query-keys";
import { invalidateCoursePracticeTopicQueries } from "@/lib/query-invalidation";
import { resolveCourseWorkspaceCapabilities } from "@/lib/course-workspace-access";
import {
  chapterTopicsHref,
  courseDetailHref,
  topicHref,
} from "@/lib/course-content-routes";
import { PracticeTopicQuestionsCard } from "@/components/admin/PracticeTopicQuestionsCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  confirmOrderDirtyLeave,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import type { CourseWorkspaceRouteBase } from "@/dtos/course-workspace.dto";
import type { Lecture, TopicKind } from "@/dtos/topic.dto";
import { LectureEditorPanel } from "@/components/course-workspace/LectureEditorPanel";
import {
  OrderSaveBar,
  SortableOrderList,
  SortableRow,
  useOrderDraft,
} from "@/components/course-workspace/SortableOrderList";

const TOPIC_SHELL_CLASS =
  "flex min-h-0 flex-1 flex-col bg-bg-primary p-3 sm:p-6";

function TopicWorkspaceInner({
  routeBase,
  mode,
}: {
  routeBase: CourseWorkspaceRouteBase;
  mode: "create" | "edit";
}) {
  const params = useParams<{ id: string; chapterId: string; topicId?: string }>();
  const courseId = params.id;
  const chapterId = params.chapterId;
  const topicId = mode === "edit" ? params.topicId : undefined;
  const { replace } = useRouter();
  const searchParams = useSearchParams();
  const lectureParam = searchParams.get("lecture");
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();

  const topicFieldId = useId();
  const { data: fullProfile, isLoading: profileLoading } = useQuery({
    queryKey: authKeys.fullProfile(),
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const capabilities = resolveCourseWorkspaceCapabilities(fullProfile, routeBase);
  const canEdit = capabilities.canMutateContent;

  const { data: course } = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: () => classApi.getCourseById(courseId),
    enabled: Boolean(courseId),
  });
  const { data: chapter } = useQuery({
    queryKey: courseKeys.chapter(courseId, chapterId),
    queryFn: () => classApi.getChapter(courseId, chapterId),
    enabled: Boolean(courseId && chapterId),
  });
  const {
    data: topic,
    isLoading: topicLoading,
    isError: topicError,
  } = useQuery({
    queryKey: [...courseKeys.topics(courseId, chapterId), topicId],
    queryFn: () => classApi.getTopic(courseId, chapterId, topicId!),
    enabled: mode === "edit" && Boolean(topicId),
  });

  const {
    data: lectures = [],
    isFetched: lecturesFetched,
    isFetching: lecturesFetching,
  } = useQuery({
    queryKey: courseKeys.lectures(topic?.id ?? ""),
    queryFn: () => classApi.getLectures(topic!.id),
    enabled: Boolean(topic?.id) && topic?.kind === "theory",
  });

  const [kind, setKind] = useState<TopicKind | null>(null);
  const [title, setTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");

  useEffect(() => {
    if (topic) {
      setTitle(topic.title);
      setSavedTitle(topic.title);
      setKind(topic.kind);
    }
  }, [topic]);

  const backToTopics = chapterTopicsHref(routeBase, courseId, chapterId);

  const createMutation = useMutation({
    mutationFn: () =>
      classApi.createTopic(courseId, chapterId, {
        kind: kind!,
        title: title.trim(),
      }),
    onSuccess: (created) => {
      toast.success("Đã tạo chuyên đề.");
      void invalidateCoursePracticeTopicQueries(queryClient, courseId);
      replace(topicHref(routeBase, courseId, chapterId, created.id));
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể tạo chuyên đề.");
    },
  });

  const saveTitle = () => {
    if (!topic || !canEdit) return;
    const next = title.trim();
    if (!next || next === savedTitle) {
      setTitle(savedTitle || topic.title);
      return;
    }
    classApi
      .updateTopic(courseId, chapterId, topic.id, { title: next })
      .then(() => {
        setSavedTitle(next);
        toast.success("Đã lưu tên chuyên đề.");
        void invalidateCoursePracticeTopicQueries(queryClient, courseId);
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        toast.error(err?.response?.data?.message || "Không thể lưu tên.");
        setTitle(savedTitle);
      });
  };

  const deleteTopic = async () => {
    if (!topic) return;
    const ok = await confirm({
      title: "Xoá chuyên đề?",
      description: `Xoá chuyên đề "${topic.title}"? Không xoá được nếu lớp đang dùng nội dung này.`,
      confirmLabel: "Xoá",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await classApi.deleteTopic(courseId, chapterId, topic.id);
      toast.success("Đã xoá chuyên đề.");
      await invalidateCoursePracticeTopicQueries(queryClient, courseId);
      replace(backToTopics);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(message || "Không thể xoá chuyên đề.");
    }
  };

  const { items: lectureItems, orderDirty, applyDrag, discard } = useOrderDraft(
    lectures,
    topic?.id ?? "none",
  );

  const reorderMutation = useMutation({
    mutationFn: (lectureIds: string[]) =>
      classApi.reorderLectures(topic!.id, lectureIds),
    onSuccess: async () => {
      toast.success("Đã lưu thứ tự bài học.");
      discard();
      await queryClient.invalidateQueries({
        queryKey: courseKeys.lectures(topic!.id),
      });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể sắp xếp bài học.");
    },
  });

  const setLectureQuery = (value: string | null) => {
    if (!topic) return;
    const href = topicHref(
      routeBase,
      courseId,
      chapterId,
      topic.id,
      value ?? undefined,
    );
    replace(href, { scroll: false });
  };

  const openLecture = async (value: string) => {
    if (!(await confirmOrderDirtyLeave(confirm, orderDirty))) return;
    discard();
    setLectureQuery(value);
  };

  const closeLectureEditor = async () => {
    setLectureQuery(null);
    await queryClient.invalidateQueries({
      queryKey: courseKeys.lectures(topic?.id ?? ""),
    });
  };

  useEffect(() => {
    if (profileLoading) return;
    if (!capabilities.canEnterWorkspace || !capabilities.canViewContentTab) {
      replace(capabilities.listHref);
    }
  }, [
    capabilities.canEnterWorkspace,
    capabilities.canViewContentTab,
    capabilities.listHref,
    profileLoading,
    replace,
  ]);

  if (profileLoading || !capabilities.canEnterWorkspace || !capabilities.canViewContentTab) {
    return (
      <div className={TOPIC_SHELL_CLASS}>
        <p className="text-sm text-text-secondary">Đang tải...</p>
      </div>
    );
  }

  if (mode === "edit" && (topicError || (!topicLoading && !topic))) {
    return (
      <div className={TOPIC_SHELL_CLASS}>
        <p className="text-sm text-error">Không tìm thấy chuyên đề.</p>
        <Link href={backToTopics} className="mt-2 text-sm text-primary underline">
          Quay lại chủ đề
        </Link>
      </div>
    );
  }

  const kindLabel = kind === "practice" ? "Luyện tập" : kind === "theory" ? "Lý thuyết" : null;
  const activeLecture: Lecture | null =
    lectureParam && lectureParam !== "new"
      ? (lectureItems.find((row) => row.id === lectureParam) ?? null)
      : null;
  const showLectureEditor =
    topic?.kind === "theory" && Boolean(lectureParam);
  const lectureMissing =
    Boolean(lectureParam) &&
    lectureParam !== "new" &&
    lecturesFetched &&
    !lecturesFetching &&
    !activeLecture;

  return (
    <div className={TOPIC_SHELL_CLASS}>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4">
        <nav className="flex shrink-0 flex-wrap items-center gap-1 text-sm text-text-secondary">
          <Link href={capabilities.listHref} className="hover:text-text-primary">
            Khoá học
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={courseDetailHref(routeBase, courseId, { tab: "noi-dung" })}
            className="hover:text-text-primary"
          >
            {course?.name ?? "Khoá"}
          </Link>
          <span aria-hidden>/</span>
          <Link href={backToTopics} className="hover:text-text-primary">
            {chapter?.title ?? "Chủ đề"}
          </Link>
        </nav>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
          {mode === "create" ? (
            <div className="flex flex-col gap-4 overflow-y-auto">
              <div>
                <h1 className="text-xl font-semibold text-text-primary">Thêm chuyên đề</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Chọn loại một lần — sau khi tạo không đổi được.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setKind("theory")}
                  className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                    kind === "theory"
                      ? "border-blue-500 bg-blue-50"
                      : "border-border-default hover:bg-bg-tertiary"
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">Lý thuyết</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Chứa các bài học: video, nội dung, bài tập ôn nhẹ.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setKind("practice")}
                  className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                    kind === "practice"
                      ? "border-amber-500 bg-amber-50"
                      : "border-border-default hover:bg-bg-tertiary"
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">Luyện tập</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Tập câu hỏi dùng chung cho các lớp. Gia sư giao vào lớp sau.
                  </p>
                </button>
              </div>
              <div>
                <label
                  htmlFor={`${topicFieldId}-create-title`}
                  className="mb-1 block text-xs font-medium text-text-muted"
                >
                  Tên chuyên đề
                </label>
                <input
                  id={`${topicFieldId}-create-title`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Hàm số bậc hai"
                  className="w-full rounded-md border border-border-default px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Link
                  href={backToTopics}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-default px-4 py-2 text-sm font-medium text-text-secondary sm:min-h-10"
                >
                  Huỷ
                </Link>
                <button
                  type="button"
                  disabled={!kind || !title.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-hover disabled:opacity-60 sm:min-h-10"
                >
                  {createMutation.isPending ? "Đang tạo…" : "Tạo chuyên đề"}
                </button>
              </div>
            </div>
          ) : topic ? (
            <div className="flex min-h-0 flex-1 flex-col gap-5">
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {kindLabel ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          kind === "practice"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {kindLabel}
                      </span>
                    ) : null}
                  </div>
                  <label
                    htmlFor={`${topicFieldId}-edit-title`}
                    className="mb-1 block text-xs font-medium text-text-muted"
                  >
                    Tên chuyên đề
                  </label>
                  <input
                    id={`${topicFieldId}-edit-title`}
                    value={title}
                    disabled={!canEdit}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full rounded-md border border-border-default px-3 py-2 text-base font-semibold text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
                  />
                  {canEdit ? (
                    <p className="mt-1 text-xs text-text-muted">Lưu khi rời ô nhập.</p>
                  ) : null}
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => void deleteTopic()}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-error/30 px-4 py-2 text-sm font-medium text-error hover:bg-error/10 sm:min-h-10"
                  >
                    Xoá chuyên đề
                  </button>
                ) : null}
              </div>

              {topic.kind === "practice" ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <PracticeTopicQuestionsCard
                    topicId={topic.id}
                    courseId={courseId}
                    canEdit={canEdit}
                  />
                </div>
              ) : showLectureEditor ? (
                lectureMissing ? (
                  <p className="text-sm text-text-secondary">Không tìm thấy bài học.</p>
                ) : lectureParam === "new" || activeLecture ? (
                <LectureEditorPanel
                  key={lectureParam ?? "new"}
                  topicId={topic.id}
                  courseId={courseId}
                  lecture={activeLecture}
                  isNew={lectureParam === "new"}
                  canEdit={canEdit}
                  onBack={() => void closeLectureEditor()}
                  onCreated={(id) => setLectureQuery(id)}
                  onDeleted={() => void closeLectureEditor()}
                />
                ) : (
                  <Skeleton className="h-40 w-full" />
                )
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-sm font-semibold text-text-primary">Bài học</h2>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => void openLecture("new")}
                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-hover sm:min-h-10"
                      >
                        Thêm bài học
                      </button>
                    ) : null}
                  </div>
                  {lectureItems.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border-default p-4 text-sm text-text-secondary">
                      Chưa có bài học. Thêm bài học để soạn video và lý thuyết.
                    </p>
                  ) : (
                    <>
                      <SortableOrderList
                        items={lectureItems}
                        canReorder={canEdit && lectureItems.length > 1}
                        onReorder={applyDrag}
                      >
                        {(lecture) => (
                          <SortableRow
                            id={lecture.id}
                            canReorder={canEdit && lectureItems.length > 1}
                            rowLabel={`Sửa bài học ${lecture.title}`}
                            onRowClick={() => void openLecture(lecture.id)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-text-primary">
                                {lecture.title}
                              </p>
                              {lecture.videoUrl ? (
                                <p className="text-xs text-text-muted">Có video</p>
                              ) : null}
                            </div>
                          </SortableRow>
                        )}
                      </SortableOrderList>
                      {canEdit ? (
                        <OrderSaveBar
                          dirty={orderDirty}
                          saving={reorderMutation.isPending}
                          onSave={() => {
                            if (!orderDirty || reorderMutation.isPending) return;
                            reorderMutation.mutate(lectureItems.map((row) => row.id));
                          }}
                          onDiscard={discard}
                        />
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </section>
      </div>
      {dialog}
    </div>
  );
}

export default function TopicWorkspace({
  routeBase,
  mode,
}: {
  routeBase: CourseWorkspaceRouteBase;
  mode: "create" | "edit";
}) {
  return (
    <Suspense
      fallback={
        <div className={TOPIC_SHELL_CLASS}>
          <p className="text-sm text-text-secondary">Đang tải...</p>
        </div>
      }
    >
      <TopicWorkspaceInner routeBase={routeBase} mode={mode} />
    </Suspense>
  );
}
