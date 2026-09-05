"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, History, BookOpen } from "lucide-react";
import { getMyClassDetail, getMyClassSessions, getMyClassSurveys, getMyClassTopics } from "@/lib/apis/student-class.api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import StudentSessionSurveyList from "@/components/student/StudentSessionSurveyList";
import StudentTopicsList from "@/components/student/StudentTopicsList";

type TabId = "history" | "topics";

export default function StudentClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = params.id as string;

  const tabParam = searchParams.get("tab");
  const activeTab: TabId = tabParam === "topics" ? "topics" : "history";

  const handleTabChange = (tab: TabId) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tab);
    router.replace(`/student/classes/${classId}?${nextParams.toString()}`, { scroll: false });
  };

  const { data: classDetail, isLoading: classDetailLoading } = useQuery({
    queryKey: ["student-class-detail", classId],
    queryFn: () => getMyClassDetail(classId),
    staleTime: 60_000,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["student-class-sessions", classId],
    queryFn: () => getMyClassSessions(classId),
  });

  const { data: surveys, isLoading: surveysLoading } = useQuery({
    queryKey: ["student-class-surveys", classId],
    queryFn: () => getMyClassSurveys(classId),
  });

  const {
    data: topicsData,
    isLoading: topicsLoading,
    fetchNextPage: fetchNextTopics,
    hasNextPage: hasNextTopics,
    isFetchingNextPage: isFetchingNextTopics,
  } = useInfiniteQuery({
    queryKey: ["student-class-topics", classId],
    queryFn: ({ pageParam = 1 }) => getMyClassTopics(classId, pageParam),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allTopics = topicsData?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Link
          href="/student"
          className="inline-flex items-center gap-1 font-medium text-text-muted transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          Danh sách lớp học
        </Link>
      </div>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        {classDetailLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                {classDetail?.class?.name || "Chi tiết lớp học"}
              </h1>
              {classDetail?.class?.course?.name && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {classDetail.class.course.name}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              {classDetail?.class?.status === "running" ? "Lớp đang mở" : "Lớp đã kết thúc"}
            </p>
          </div>
        )}
      </div>

      {/* High-contrast Large Tab navigation */}
      <div className="flex gap-2 rounded-2xl border border-border-default bg-bg-secondary/70 p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => handleTabChange("history")}
          className={cn(
            "flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm sm:text-base font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            activeTab === "history"
              ? "bg-primary text-text-inverse shadow-md ring-1 ring-primary/30"
              : "bg-transparent text-text-secondary hover:bg-bg-surface hover:text-text-primary",
          )}
        >
          <History className="size-4 sm:size-5" />
          <span>Lịch sử</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("topics")}
          className={cn(
            "flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm sm:text-base font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            activeTab === "topics"
              ? "bg-primary text-text-inverse shadow-md ring-1 ring-primary/30"
              : "bg-transparent text-text-secondary hover:bg-bg-surface hover:text-text-primary",
          )}
        >
          <BookOpen className="size-4 sm:size-5" />
          <span>Chuyên đề</span>
          {allTopics.length > 0 && (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors",
                activeTab === "topics"
                  ? "bg-text-inverse/20 text-text-inverse"
                  : "bg-bg-tertiary text-text-secondary",
              )}
            >
              {allTopics.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <Card>
        <CardContent className="pt-6">
          {activeTab === "history" && (
            <StudentSessionSurveyList
              sessions={sessions ?? []}
              surveys={surveys ?? []}
              isLoading={sessionsLoading || surveysLoading}
            />
          )}
          {activeTab === "topics" && (
            <StudentTopicsList
              topics={allTopics}
              classId={classId}
              isLoading={topicsLoading}
              hasNextPage={hasNextTopics}
              isFetchingNextPage={isFetchingNextTopics}
              fetchNextPage={fetchNextTopics}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
