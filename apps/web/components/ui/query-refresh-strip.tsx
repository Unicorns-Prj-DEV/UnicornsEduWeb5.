import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type QueryRefreshStripProps = {
  active: boolean;
  label?: string;
  className?: string;
};

export default function QueryRefreshStrip({
  active,
  label = "Đang cập nhật dữ liệu...",
  className,
}: QueryRefreshStripProps) {
  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border-default bg-bg-secondary/70 px-3 py-2 text-xs font-medium text-text-secondary shadow-sm",
        className,
      )}
    >
      <span className="size-2 shrink-0 rounded-full bg-primary animate-pulse" aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
      <div className="ml-auto hidden min-w-24 flex-1 items-center gap-1.5 sm:flex">
        <Skeleton className="h-1.5 flex-1 rounded-full bg-primary/20" />
        <Skeleton className="h-1.5 w-12 rounded-full bg-primary/15" />
      </div>
    </div>
  );
}
