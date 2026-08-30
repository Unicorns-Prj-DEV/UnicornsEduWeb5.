"use client";

import type { StudentTopicItem } from "@/dtos/student-class.dto";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import YouTubeEmbed from "@/components/ui/YouTubeEmbed";
import { Badge } from "@/components/ui/badge";
import MathContent from "@/components/ui/MathContent";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default function StudentTopicDetailDialog({
  topic,
  onClose,
}: {
  topic: StudentTopicItem;
  onClose: () => void;
}) {
  const hasVideo = Boolean(topic.videoUrl);
  const hasContent = Boolean(topic.content);
  const isTwoColumn = hasVideo && hasContent;

  return (
    <ResponsiveDialog onBackdropClick={onClose} size={isTwoColumn ? "7xl" : "4xl"}>
      <ResponsiveDialogBody className="max-h-[94vh] overflow-y-auto p-5 sm:p-7">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border-default pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Chuyên đề học tập</Badge>
                {topic.videoUrl && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Kèm video bài giảng
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-xl font-bold text-text-primary sm:text-2xl">
                {topic.title}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                Ngày đăng: {formatDate(topic.createdAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Đóng popup"
            >
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content Area (Responsive 2-Column when both video and content exist) */}
          {isTwoColumn ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
              {/* Left Column: Large Video (Sticky on desktop) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-2 lg:sticky lg:top-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Video bài giảng chuyên đề
                  </span>
                  <span className="text-[11px] text-text-muted">Bảo mật nội dung</span>
                </div>
                <YouTubeEmbed
                  url={topic.videoUrl!}
                  protected
                  className="w-full aspect-video min-h-[280px] sm:min-h-[380px] md:min-h-[440px] lg:min-h-[480px] xl:min-h-[560px] 2xl:min-h-[620px] rounded-2xl shadow-xl"
                />
              </div>

              {/* Right Column: WYSIWYG Content (Scrollable independently) */}
              <div className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-border-default bg-bg-secondary/30 p-5 sm:p-6 lg:max-h-[calc(88vh-120px)] lg:overflow-y-auto lg:overscroll-contain [scrollbar-width:thin]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  Nội dung chi tiết
                </h3>
                <MathContent content={topic.content!} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {topic.videoUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Video bài giảng chuyên đề
                    </span>
                    <span className="text-[11px] text-text-muted">Bảo mật nội dung</span>
                  </div>
                  <YouTubeEmbed url={topic.videoUrl} protected className="w-full aspect-video min-h-[340px] sm:min-h-[440px] rounded-2xl shadow-xl" />
                </div>
              )}

              {topic.content ? (
                <div className="rounded-2xl border border-border-default bg-bg-secondary/30 p-5 sm:p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                    Nội dung chi tiết
                  </h3>
                  <MathContent content={topic.content} />
                </div>
              ) : (
                !topic.videoUrl && (
                  <p className="text-sm text-text-muted text-center py-6">
                    Chuyên đề này hiện chưa có nội dung văn bản hoặc video.
                  </p>
                )
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border-subtle">
            <button
              onClick={onClose}
              className="rounded-xl border border-border-default bg-bg-surface px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-secondary"
            >
              Đóng
            </button>
          </div>
        </div>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
