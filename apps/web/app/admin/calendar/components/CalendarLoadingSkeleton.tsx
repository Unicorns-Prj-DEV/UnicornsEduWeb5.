import { Skeleton } from "@/components/ui/skeleton";
import styles from "./CalendarView.module.css";

type CalendarLoadingSkeletonProps = {
  viewMode: "calendar" | "schedule";
};

const dayPlaceholders = Array.from({ length: 7 }, (_, index) => index);
const hourPlaceholders = Array.from({ length: 16 }, (_, index) => index);
const scheduleGroups = [2, 3, 2];

export default function CalendarLoadingSkeleton({
  viewMode,
}: CalendarLoadingSkeletonProps) {
  if (viewMode === "schedule") {
    return <CalendarScheduleListSkeleton />;
  }

  return <CalendarBoardSkeleton />;
}

function CalendarBoardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Lịch đang tải"
      role="status"
      className={`${styles.calendarShell} rounded-xl border border-border-default bg-bg-surface p-1.5 text-sm shadow-sm sm:p-2.5`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5 sm:hidden">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>

      <div className="overflow-x-auto overscroll-x-contain pb-1">
        <div className={styles.calendarScroller}>
          <div className="overflow-hidden rounded-[18px] border border-border-default/80 bg-bg-surface">
            <div className="grid grid-cols-[64px_repeat(7,minmax(104px,1fr))] border-b border-border-default/80 bg-bg-secondary/70 sm:grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
              <div className="border-r border-border-default/80 p-2">
                <Skeleton className="h-3 w-10" />
              </div>
              {dayPlaceholders.map((day) => (
                <div
                  key={`calendar-day-header-skeleton-${day}`}
                  className="border-r border-border-default/80 px-2 py-2 last:border-r-0"
                >
                  <Skeleton className="mx-auto h-3.5 w-14 rounded-full" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[64px_repeat(7,minmax(104px,1fr))] sm:grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
              <div className="border-b border-r border-border-default/80 bg-bg-secondary/45 px-2 py-3">
                <Skeleton className="h-3 w-12" />
              </div>
              {dayPlaceholders.map((day) => (
                <div
                  key={`calendar-all-day-skeleton-${day}`}
                  className="h-11 border-b border-r border-border-default/80 px-2 py-2 last:border-r-0"
                >
                  {day % 3 === 0 ? (
                    <Skeleton className="h-6 w-full rounded-lg" />
                  ) : null}
                </div>
              ))}

              {hourPlaceholders.map((hour) => (
                <CalendarHourSkeleton key={`calendar-hour-skeleton-${hour}`} hour={hour} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarHourSkeleton({ hour }: { hour: number }) {
  return (
    <>
      <div className="h-16 border-b border-r border-border-default/80 bg-bg-surface px-2 py-2 sm:h-[4.25rem]">
        <Skeleton className="h-3 w-10" />
      </div>
      {dayPlaceholders.map((day) => (
        <div
          key={`calendar-cell-skeleton-${hour}-${day}`}
          className="relative h-16 border-b border-r border-border-default/80 bg-bg-surface px-1.5 py-1.5 last:border-r-0 sm:h-[4.25rem]"
        >
          {shouldShowEventBlock(hour, day) ? (
            <div className="space-y-1.5 rounded-xl border border-border-default bg-bg-secondary/65 p-2 shadow-sm">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-2/3" />
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}

function shouldShowEventBlock(hour: number, day: number) {
  return (
    (hour === 2 && day === 1) ||
    (hour === 4 && day === 4) ||
    (hour === 7 && day === 2) ||
    (hour === 10 && day === 5) ||
    (hour === 13 && day === 0)
  );
}

function CalendarScheduleListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Lịch đang tải"
      role="status"
      className="space-y-3"
    >
      {scheduleGroups.map((rowCount, groupIndex) => (
        <section
          key={`calendar-schedule-group-skeleton-${groupIndex}`}
          className="overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-sm"
        >
          <header className="border-b border-border-default bg-bg-secondary/60 px-3 py-2">
            <Skeleton className="h-4 w-36 rounded-full" />
          </header>

          <div className="divide-y divide-border-default">
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <div
                key={`calendar-schedule-row-skeleton-${groupIndex}-${rowIndex}`}
                className="flex w-full items-stretch gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3"
              >
                <div className="min-w-[88px] shrink-0 rounded-lg border border-border-default bg-bg-secondary px-2 py-1.5">
                  <Skeleton className="h-3.5 w-14" />
                </div>

                <div className="min-w-0 flex-1 rounded-xl border border-l-4 border-border-default border-l-primary/20 px-3 py-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-44 max-w-full" />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
                  </div>
                  {rowIndex % 2 === 0 ? (
                    <Skeleton className="mt-2 h-3 w-2/3" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
