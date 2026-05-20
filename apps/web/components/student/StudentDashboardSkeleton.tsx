import { Skeleton } from "@/components/ui/skeleton";

const classRows = Array.from({ length: 3 });
const summaryCards = Array.from({ length: 3 });

function StudentInfoCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-[1.25rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <Skeleton className="h-4 w-36 bg-bg-tertiary" />
      <div className="mt-4 divide-y divide-border-subtle">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-4 py-3">
            <Skeleton className="h-3.5 w-28 bg-bg-tertiary" />
            <Skeleton className="h-4 w-32 bg-bg-tertiary" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentWalletPanelSkeleton() {
  return (
    <div className="rounded-[1.25rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <Skeleton className="h-4 w-24 bg-bg-tertiary" />
      <Skeleton className="mt-4 h-8 w-40 bg-bg-tertiary" />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Skeleton className="h-10 bg-bg-tertiary" />
        <Skeleton className="h-10 bg-bg-tertiary" />
      </div>
      <Skeleton className="mt-3 h-10 w-full bg-bg-tertiary" />
    </div>
  );
}

function StudentExamPanelSkeleton() {
  return (
    <div className="rounded-[1.25rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32 bg-bg-tertiary" />
        <Skeleton className="h-8 w-20 bg-bg-tertiary" />
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-12 w-full bg-bg-tertiary" />
        <Skeleton className="h-12 w-full bg-bg-tertiary" />
        <Skeleton className="h-12 w-full bg-bg-tertiary" />
      </div>
    </div>
  );
}

function StudentClassListSkeleton() {
  return (
    <div className="rounded-[1.25rem] border border-border-default bg-bg-secondary/50 p-3.5 sm:rounded-2xl sm:p-4">
      <div className="max-w-2xl">
        <Skeleton className="h-4 w-36 bg-bg-tertiary" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl bg-bg-tertiary" />
        <Skeleton className="mt-2 h-4 w-4/5 max-w-lg bg-bg-tertiary" />
      </div>

      <div className="mt-4 grid gap-3 lg:hidden md:grid-cols-1">
        {classRows.map((_, index) => (
          <div
            key={index}
            className="rounded-[1.1rem] border border-border-default bg-bg-surface px-3.5 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 shrink-0 rounded-full bg-bg-tertiary" />
              <Skeleton className="h-4 flex-1 bg-bg-tertiary" />
              <Skeleton className="h-5 w-20 rounded-full bg-bg-tertiary" />
            </div>
            <div className="mt-3 grid gap-2">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div key={rowIndex} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3.5 w-28 bg-bg-tertiary" />
                  <Skeleton className="h-4 w-24 bg-bg-tertiary" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-[1.1rem] border border-border-default bg-bg-surface lg:block">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[minmax(0,1.35fr)_150px_180px_230px_150px] gap-3 border-b border-border-default bg-bg-secondary/60 px-4 py-3">
            <Skeleton className="h-3 w-20 bg-bg-tertiary" />
            <Skeleton className="h-3 w-20 bg-bg-tertiary" />
            <Skeleton className="h-3 w-24 bg-bg-tertiary" />
            <Skeleton className="h-3 w-24 bg-bg-tertiary" />
            <Skeleton className="ml-auto h-3 w-24 bg-bg-tertiary" />
          </div>
          <div className="divide-y divide-border-subtle">
            {classRows.map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1.35fr)_150px_180px_230px_150px] gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Skeleton className="size-2 shrink-0 rounded-full bg-bg-tertiary" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-4/5 bg-bg-tertiary" />
                    <Skeleton className="mt-2 h-5 w-24 rounded-full bg-bg-tertiary" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20 bg-bg-tertiary" />
                <Skeleton className="h-4 w-28 bg-bg-tertiary" />
                <Skeleton className="h-4 w-40 bg-bg-tertiary" />
                <Skeleton className="ml-auto h-4 w-16 bg-bg-tertiary" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentDashboardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface/90 px-3.5 py-2 shadow-sm">
          <Skeleton className="size-2 rounded-full bg-bg-tertiary" />
          <Skeleton className="h-3 w-40 bg-bg-tertiary" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Skeleton className="h-11 w-36 bg-bg-tertiary" />
          <Skeleton className="h-11 w-32 bg-bg-tertiary" />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface p-3.5 shadow-sm sm:rounded-[1.75rem] sm:p-5">
        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
              <Skeleton className="size-14 shrink-0 rounded-[1.25rem] bg-bg-tertiary sm:size-20 sm:rounded-2xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-36 bg-bg-tertiary" />
                <Skeleton className="mt-3 h-7 w-56 max-w-full bg-bg-tertiary" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-bg-tertiary" />
                  <Skeleton className="h-6 w-16 rounded-full bg-bg-tertiary" />
                </div>
                <div className="mt-4 grid gap-2 sm:hidden">
                  <div className="rounded-2xl border border-border-default bg-bg-primary/80 px-4 py-3">
                    <Skeleton className="h-3 w-24 bg-bg-tertiary" />
                    <Skeleton className="mt-2 h-4 w-full bg-bg-tertiary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex xl:flex-col xl:items-stretch">
              <Skeleton className="h-10 w-60 bg-bg-tertiary xl:w-52" />
            </div>
          </div>

          <div className="mt-4 grid gap-3.5 sm:mt-5 sm:gap-4">
            <div className="grid min-w-0 gap-3.5 md:grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.1fr)] sm:gap-4">
              <StudentInfoCardSkeleton rows={6} />
              <StudentInfoCardSkeleton rows={4} />
              <div className="grid min-w-0 gap-y-3.5 md:col-span-1 md:grid-cols-2 md:gap-4 xl:col-span-1 xl:block xl:space-y-4">
                <StudentWalletPanelSkeleton />
                <StudentExamPanelSkeleton />
              </div>
            </div>

            <StudentClassListSkeleton />

            <div className="grid gap-3 md:grid-cols-1 xl:grid-cols-3">
              {summaryCards.map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.15rem] border border-border-default bg-bg-surface px-4 py-4 shadow-sm"
                >
                  <Skeleton className="h-3 w-28 bg-bg-tertiary" />
                  <Skeleton className="mt-3 h-5 w-32 bg-bg-tertiary" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
