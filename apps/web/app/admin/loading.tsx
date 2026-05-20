import { Skeleton } from "@/components/ui/skeleton";

const SHELL_TILE_COUNT = 3;
const SHELL_BLOCK_COUNT = 2;

export default function AdminLoading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Đang tải…</span>

      {/* Segment fallback stays route-neutral; route loading files own table/card fidelity. */}
      <div className="space-y-4">
        <section className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-3 w-24 bg-bg-tertiary" />
              <Skeleton className="h-8 w-48 max-w-full bg-bg-tertiary" />
              <Skeleton className="h-4 w-full max-w-md bg-bg-tertiary" />
            </div>
            <Skeleton className="h-10 w-32 bg-bg-tertiary" />
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: SHELL_TILE_COUNT }).map((_, index) => (
            <Skeleton
              key={`admin-shell-tile-${index}`}
              className="h-24 rounded-2xl border border-border-default bg-bg-surface"
            />
          ))}
        </section>

        <section className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40 bg-bg-tertiary" />
            {Array.from({ length: SHELL_BLOCK_COUNT }).map((_, index) => (
              <Skeleton
                key={`admin-shell-block-${index}`}
                className="h-28 rounded-xl bg-bg-secondary"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
