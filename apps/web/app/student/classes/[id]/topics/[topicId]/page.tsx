"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, PlayCircle, Calendar, BookOpen, AlertCircle, FileText } from "lucide-react";
import { getMyClassDetail, getMyClassTopic } from "@/lib/apis/student-class.api";
import { Skeleton } from "@/components/ui/skeleton";
import YouTubeEmbed from "@/components/ui/YouTubeEmbed";
import { Card, CardContent } from "@/components/ui/card";
import MathContent from "@/components/ui/MathContent";

function formatDate(date?: Date | string | null): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "—";
  }
}

export default function StudentTopicDetailPage() {
  const params = useParams();
  const classId = params.id as string;
  const topicId = params.topicId as string;

  const { data: classDetail } = useQuery({
    queryKey: ["student-class-detail", classId],
    queryFn: () => getMyClassDetail(classId),
    staleTime: 60_000,
  });

  const {
    data: topic,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["student-class-topic", classId, topicId],
    queryFn: () => getMyClassTopic(classId, topicId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Navigation */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-48 rounded-md" />
        </div>

        {/* Skeleton Header */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-36 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4 sm:w-1/2 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>

        {/* Skeleton Content */}
        <div className="space-y-6">
          <div className="max-w-4xl mx-auto w-full space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
            <Skeleton className="w-full aspect-video rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !topic) {
    const errorMessage =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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

  const hasVideo = Boolean(topic.videoUrl);
  const hasContent = Boolean(topic.content);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb / Back Link */}
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

      {/* Header Banner Card */}
      <header className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <BookOpen className="size-3.5" />
              Chuyên đề học tập
            </span>
            {hasVideo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2.5 py-0.5 text-xs font-semibold text-info">
                <PlayCircle className="size-3.5" />
                Kèm video bài giảng
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
            {topic.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted pt-1 border-t border-border-subtle">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5 text-text-muted/70" />
              Ngày đăng: <strong className="font-medium text-text-secondary">{formatDate(topic.createdAt)}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Video Player (Centered) */}
      {hasVideo && (
        <section aria-label="Video bài giảng" className="space-y-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <PlayCircle className="size-4" />
              Video bài giảng chuyên đề
            </span>
            <span className="text-[11px] text-text-muted">Bảo mật nội dung</span>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-xl border border-border-default bg-black">
            <YouTubeEmbed
              url={topic.videoUrl!}
              protected
              title={topic.title}
              className="w-full aspect-video min-h-[260px] sm:min-h-[380px] md:min-h-[460px] lg:min-h-[500px]"
            />
          </div>
        </section>
      )}

      {/* Content Section (Wide Card Underneath) */}
      {hasContent && (
        <section aria-label="Nội dung chuyên đề" className="w-full">
          <Card className="rounded-2xl border border-border-default bg-bg-surface shadow-sm">
            <CardContent className="p-5 sm:p-7 md:p-8">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle">
                <FileText className="size-4 text-primary" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-secondary">
                  Nội dung chi tiết
                </h2>
              </div>
              <div className="text-text-primary text-sm sm:text-base leading-relaxed">
                <MathContent content={topic.content!} />
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Empty State */}
      {!hasVideo && !hasContent && (
        <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface p-10 text-center text-sm text-text-muted">
          Chuyên đề này hiện chưa có nội dung văn bản hoặc video đính kèm.
        </div>
      )}
    </div>
  );
}
