"use client";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-bg-tertiary ${className}`}
      aria-hidden
    />
  );
}

export default function LessonOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[1.75rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <SkeletonBlock className="h-8 w-56" />
        <div className="space-y-3">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
      </div>

      <div className="space-y-4 rounded-[1.75rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <SkeletonBlock className="h-8 w-52" />
        <div className="space-y-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      </div>
    </div>
  );
}
