"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  PlayCircle,
  Calendar,
  BookOpen,
  AlertCircle,
  FileText,
  List,
  CheckCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMyClassDetail,
  getMyClassTopic,
  getMyLectureQuizzes,
  getMyQuizAnswers,
  recordMyTheoryTopicView,
  submitMyQuizAnswers,
} from "@/lib/apis/student-class.api";
import { getLectures, getStudentClassContent } from "@/lib/apis/class.api";
import { Skeleton } from "@/components/ui/skeleton";
import YouTubeEmbed from "@/components/ui/YouTubeEmbed";
import { Card, CardContent } from "@/components/ui/card";
import MathContent from "@/components/ui/MathContent";
import { cn } from "@/lib/utils";
import type { Lecture, LectureQuizQuestion, LectureQuizAnswer } from "@/dtos/topic.dto";
import { CONTENT_LIMITS, overLimitMessage } from "@/dtos/content-limits";
import { formatVnDate } from "@/lib/formatters";

function formatDate(date?: Date | string | null): string {
  if (!date) return "—";
  try {
    return formatVnDate(new Date(date));
  } catch {
    return "—";
  }
}

export default function StudentTopicDetailPage() {
  const params = useParams();
  const classId = params.id as string;
  const topicId = params.topicId as string;
  const queryClient = useQueryClient();
  const [selectedLectureIdx, setSelectedLectureIdx] = useState(0);
  const recordedTheoryViewKeyRef = useRef<string | null>(null);

  const { data: classDetail } = useQuery({
    queryKey: ["student-class-detail", classId],
    queryFn: () => getMyClassDetail(classId),
    staleTime: 60_000,
  });

  const {
    data: topic,
    isLoading: topicLoading,
    isError: topicError,
    error: topicErr,
  } = useQuery({
    queryKey: ["student-class-topic", classId, topicId],
    queryFn: () => getMyClassTopic(classId, topicId),
    staleTime: 60_000,
  });

  const { mutate: recordTheoryTopicView } = useMutation({
    mutationFn: recordMyTheoryTopicView,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["class-theory-progress", variables.classId],
      });
    },
  });

  useEffect(() => {
    if (topic?.kind !== "theory") return;
    const viewKey = `${classId}:${topicId}`;
    if (recordedTheoryViewKeyRef.current === viewKey) return;
    recordedTheoryViewKeyRef.current = viewKey;
    recordTheoryTopicView({ classId, topicId });
  }, [classId, recordTheoryTopicView, topic?.kind, topicId]);

  const {
    data: lectures,
    isLoading: lecturesLoading,
  } = useQuery({
    queryKey: ["topic-lectures", topicId],
    queryFn: () => getLectures(topicId),
    staleTime: 60_000,
  });

  const isLoading = topicLoading || lecturesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-48 rounded-md" />
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm space-y-3">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-8 w-3/4 sm:w-1/2 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
        <div className="space-y-6">
          <div className="max-w-4xl mx-auto w-full space-y-2">
            <Skeleton className="w-full aspect-video rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (topicError || !topic) {
    const errorMessage =
      (topicErr as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Không tìm thấy chuyên đề hoặc bạn không có quyền truy cập chuyên đề của lớp này.";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Link
            href={`/student/classes/${classId}?tab=topics`}
            className="inline-flex items-center gap-1 font-medium text-text-muted transition-colors hover:text-primary"
          >
            <ChevronLeft className="size-4" />
            Quay lại danh sách chuyên đề
          </Link>
        </div>

        <div className="rounded-2xl border border-error/30 bg-error/10 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-error/20 text-error">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-base font-semibold text-text-primary">
            Không tải được chuyên đề
          </h2>
          <p className="mt-1 text-sm text-text-muted max-w-md mx-auto">
            {errorMessage}
          </p>
          <div className="mt-5">
            <Link
              href={`/student/classes/${classId}?tab=topics`}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
            >
              Về danh sách chuyên đề
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lectureList: Lecture[] = lectures ?? [];
  const isPractice = topic.kind === "practice";
  if (isPractice) {
    return (
      <PracticeTopicRedirect classId={classId} topicId={topicId} title={topic.title} />
    );
  }
  const selectedLecture: Lecture | undefined = lectureList[selectedLectureIdx];
  const hasLectures = lectureList.length > 0;
  const hasVideo = Boolean(selectedLecture?.videoUrl);
  const hasContent = Boolean(selectedLecture?.content);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-text-muted">
        <Link
          href="/student"
          className="font-medium text-text-muted transition-colors hover:text-primary"
        >
          Lớp học
        </Link>
        <span>/</span>
        <Link
          href={`/student/classes/${classId}?tab=topics`}
          className="inline-flex items-center gap-1 font-medium text-text-muted transition-colors hover:text-primary max-w-[200px] sm:max-w-xs truncate"
        >
          {classDetail?.class?.name || "Chi tiết lớp"}
        </Link>
        <span>/</span>
        <span className="font-semibold text-text-primary max-w-[220px] sm:max-w-sm truncate">
          {topic.title}
        </span>
      </div>

      {/* Header */}
      <header className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <BookOpen className="size-3.5" />
              Chuyên đề học tập
            </span>
            {hasLectures && (
              <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2.5 py-0.5 text-xs font-semibold text-info">
                <PlayCircle className="size-3.5" />
                {lectureList.length} bài học
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
            {topic.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-1 border-t border-border-subtle">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5 text-text-muted/70" />
              Ngày đăng:{" "}
              <strong className="font-medium text-text-secondary">
                {formatDate(topic.createdAt)}
              </strong>
            </span>
          </div>
        </div>
      </header>

      {/* Lecture selector — only when multiple lectures */}
      {lectureList.length > 1 && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <List className="size-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Danh sách bài học
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lectureList.map((lec, idx) => (
              <button
                key={lec.id}
                type="button"
                onClick={() => setSelectedLectureIdx(idx)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
                  idx === selectedLectureIdx
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border-default bg-bg-secondary/40 text-text-secondary hover:border-primary/40 hover:bg-bg-secondary/70",
                )}
              >
                <PlayCircle className="size-3.5 shrink-0" />
                <span className="truncate max-w-[200px]">
                  {lec.title || `Bài ${idx + 1}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video */}
      {hasVideo && selectedLecture && (
        <section aria-label="Video bài giảng" className="space-y-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <PlayCircle className="size-4" />
              {selectedLecture.title || "Video bài giảng"}
            </span>
            <span className="text-[11px] text-text-muted">Bảo mật nội dung</span>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-xl border border-border-default bg-black">
            <YouTubeEmbed
              url={selectedLecture.videoUrl!}
              protected
              title={selectedLecture.title || topic.title}
              className="w-full aspect-video min-h-[260px] sm:min-h-[380px] md:min-h-[460px] lg:min-h-[500px]"
            />
          </div>
        </section>
      )}

      {/* Content */}
      {hasContent && selectedLecture && (
        <section aria-label="Nội dung bài học" className="w-full">
          <Card className="rounded-2xl border border-border-default bg-bg-surface shadow-sm">
            <CardContent className="p-5 sm:p-7 md:p-8">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle">
                <FileText className="size-4 text-primary" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-secondary">
                  {selectedLecture.title || "Nội dung chi tiết"}
                </h2>
              </div>
              <div className="text-text-primary text-sm sm:text-base leading-relaxed">
                <MathContent content={selectedLecture.content!} />
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Quiz Section */}
      {selectedLecture && (
        <LectureQuizSection
          classId={classId}
          topicId={topicId}
          lectureId={selectedLecture.id}
        />
      )}

      {/* Empty state */}
      {!hasLectures && (
        <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface p-10 text-center text-sm text-text-muted">
          Chuyên đề này hiện chưa có bài học nào.
        </div>
      )}
      {hasLectures && !hasVideo && !hasContent && (
        <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface p-10 text-center text-sm text-text-muted">
          Bài học này hiện chưa có nội dung văn bản hoặc video đính kèm.
        </div>
      )}
    </div>
  );
}

function PracticeTopicRedirect({
  classId,
  topicId,
  title,
}: {
  classId: string;
  topicId: string;
  title: string;
}) {
  const router = useRouter();
  const { data: items } = useQuery({
    queryKey: ["student-class-content", classId],
    queryFn: () => getStudentClassContent(classId),
  });
  const assignment = items?.find(
    (item) => item.topicId === topicId && item.topicKind === "practice",
  );

  useEffect(() => {
    if (assignment) {
      router.replace(
        `/student/classes/${classId}/assignments/${assignment.id}`,
      );
    }
  }, [assignment, classId, router]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Đang mở bài luyện tập «{title}»…
      </p>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

// ─── Lecture Quiz Section ─────────────────────────────────────

function LectureQuizSection({
  classId,
  topicId,
  lectureId,
}: {
  classId: string;
  topicId: string;
  lectureId: string;
}) {
  const queryClient = useQueryClient();
  const [draftAnswers, setDraftAnswers] = useState<
    Record<string, { choiceIndex?: number | null; essayAnswer?: string | null }>
  >({});

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["student-lecture-quizzes", classId, topicId, lectureId],
    queryFn: () => getMyLectureQuizzes(classId, topicId, lectureId),
    staleTime: 60_000,
  });

  const { data: savedAnswers = [] } = useQuery({
    queryKey: ["student-quiz-answers", classId, topicId, lectureId],
    queryFn: () => getMyQuizAnswers(classId, topicId, lectureId),
    staleTime: 60_000,
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const answers = quizzes.map((q) => ({
        questionId: q.questionId,
        choiceIndex: draftAnswers[q.questionId]?.choiceIndex ?? null,
        essayAnswer: draftAnswers[q.questionId]?.essayAnswer ?? null,
      }));
      if (
        answers.some(
          (a) => (a.essayAnswer?.length ?? 0) > CONTENT_LIMITS.essayAnswer,
        )
      ) {
        throw new Error(
          overLimitMessage("Câu trả lời", CONTENT_LIMITS.essayAnswer),
        );
      }
      return submitMyQuizAnswers(classId, topicId, lectureId, answers);
    },
    onSuccess: () => {
      toast.success("Đã nộp bài tập ôn nhẹ.");
      queryClient.invalidateQueries({
        queryKey: ["student-quiz-answers", classId, topicId, lectureId],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể nộp bài. Vui lòng thử lại.",
      );
    },
  });

  if (quizzesLoading) {
    return (
      <Card className="rounded-2xl border border-border-default bg-bg-surface shadow-sm">
        <CardContent className="p-5 sm:p-7">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-24 w-full mb-3" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (quizzes.length === 0) return null;

  const hasSavedAnswers = savedAnswers.length > 0;

  return (
    <section aria-label="Bài tập ôn nhẹ" className="w-full">
      <Card className="rounded-2xl border border-border-default bg-bg-surface shadow-sm">
        <CardContent className="p-5 sm:p-7 md:p-8">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle">
            <CheckCircle className="size-4 text-primary" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-secondary">
              Bài tập ôn nhẹ — {quizzes.length} câu hỏi
            </h2>
          </div>

          {hasSavedAnswers ? (
            <QuizReview answers={savedAnswers} />
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz, idx) => (
                <QuizQuestionInput
                  key={quiz.questionId}
                  quiz={quiz}
                  index={idx}
                  value={draftAnswers[quiz.questionId]}
                  onChange={(val) =>
                    setDraftAnswers((prev) => ({
                      ...prev,
                      [quiz.questionId]: val,
                    }))
                  }
                />
              ))}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  <Send className="size-4" />
                  {submitMutation.isPending ? "Đang nộp..." : "Nộp bài"}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Quiz Question Input ─────────────────────────────────────

function QuizQuestionInput({
  quiz,
  index,
  value,
  onChange,
}: {
  quiz: LectureQuizQuestion;
  index: number;
  value?: { choiceIndex?: number | null; essayAnswer?: string | null };
  onChange: (val: { choiceIndex?: number | null; essayAnswer?: string | null }) => void;
}) {
  const isSingleChoice = quiz.question.type === "single_choice";
  const options: string[] = quiz.question.options ?? [];

  return (
    <div className="rounded-xl border border-border-default p-4">
      <p className="text-sm font-medium text-text-primary mb-3">
        <span className="text-primary mr-1">Câu {index + 1}.</span>
        <MathContent content={quiz.question.content} className="inline" />
      </p>

      {isSingleChoice ? (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                value?.choiceIndex === i
                  ? "border-primary bg-primary/5 text-text-primary"
                  : "border-border-default hover:bg-bg-secondary/50 text-text-secondary",
              )}
            >
              <input
                type="radio"
                name={`quiz-${quiz.questionId}`}
                checked={value?.choiceIndex === i}
                onChange={() => onChange({ choiceIndex: i })}
                className="accent-primary"
              />
              <span className="font-medium text-text-muted mr-1">
                {String.fromCharCode(65 + i)}.
              </span>
              <MathContent content={opt} className="text-sm" />
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={value?.essayAnswer ?? ""}
          onChange={(e) => onChange({ essayAnswer: e.target.value })}
          aria-label="Nhập câu trả lời"
          placeholder="Nhập câu trả lời..."
          rows={4}
          aria-invalid={
            (value?.essayAnswer?.length ?? 0) > CONTENT_LIMITS.essayAnswer
          }
          className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        />
      )}
      {!isSingleChoice &&
        (value?.essayAnswer?.length ?? 0) > CONTENT_LIMITS.essayAnswer && (
          <p className="mt-1 text-xs text-error">
            {overLimitMessage("Câu trả lời", CONTENT_LIMITS.essayAnswer)}
          </p>
        )}
    </div>
  );
}

// ─── Quiz Review (after submission) ──────────────────────────

function QuizReview({ answers }: { answers: LectureQuizAnswer[] }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted mb-2">
        Bạn đã nộp bài. Dưới đây là câu trả lời của bạn kèm đáp án đúng.
      </p>
      {answers.map((ans, idx) => {
        const isCorrect =
          ans.question.type === "single_choice" &&
          ans.choiceIndex === ans.question.correctIndex;
        const isEssay = ans.question.type === "essay";

        return (
          <div
            key={ans.questionId}
            className={cn(
              "rounded-xl border p-4",
              isCorrect
                ? "border-success/30 bg-success/5"
                : isEssay
                  ? "border-border-default"
                  : "border-error/30 bg-error/5",
            )}
          >
            <p className="text-sm font-medium text-text-primary mb-2">
              <span className="text-primary mr-1">Câu {idx + 1}.</span>
              <MathContent content={ans.question.content} className="inline" />
            </p>

            {/* Student answer */}
            <div className="mb-2">
              <span className="text-xs font-semibold text-text-muted">Câu trả lời của bạn: </span>
              {isEssay ? (
                <p className="mt-1 text-sm text-text-secondary whitespace-pre-wrap">
                  {ans.essayAnswer || "(chưa trả lời)"}
                </p>
              ) : (
                <span className="text-sm text-text-secondary">
                  {ans.choiceIndex !== null
                    ? `${String.fromCharCode(65 + ans.choiceIndex)}. ${
                        (ans.question.options ?? [])[ans.choiceIndex] ?? ""
                      }`
                    : "(chưa chọn)"}
                </span>
              )}
            </div>

            {/* Correct answer (for single_choice) */}
            {!isEssay && ans.question.correctIndex !== null && (
              <div className="mb-1">
                <span className="text-xs font-semibold text-text-muted">Đáp án đúng: </span>
                <span className="inline-flex flex-wrap items-baseline gap-1 text-sm font-medium text-success">
                  <span>{String.fromCharCode(65 + ans.question.correctIndex)}.</span>
                  <MathContent
                    content={
                      (ans.question.options ?? [])[ans.question.correctIndex] ?? ""
                    }
                    className="inline text-sm text-success [&_.katex]:text-success"
                  />
                </span>
              </div>
            )}

            {/* Explanation */}
            {ans.question.explanation && (
              <div className="mt-2 rounded-lg bg-bg-secondary/50 p-2.5">
                <span className="text-xs font-semibold text-text-muted">Giải thích: </span>
                <MathContent
                  content={ans.question.explanation}
                  className="text-xs text-text-secondary"
                />
              </div>
            )}

            {/* Answer guide for essay */}
            {isEssay && ans.question.answerGuide && (
              <div className="mt-2 rounded-lg bg-bg-secondary/50 p-2.5">
                <span className="text-xs font-semibold text-text-muted">Hướng dẫn: </span>
                <MathContent
                  content={ans.question.answerGuide}
                  className="text-xs text-text-secondary"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
