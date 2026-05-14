import type { ReactNode } from "react";

export default function StudentInfoCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-[1.4rem] border border-border-default bg-bg-surface p-3.5 shadow-sm sm:rounded-2xl sm:p-5 ${className}`}
      aria-labelledby={`student-card-${title.replace(/\s+/g, "-")}`}
    >
      <h2
        id={`student-card-${title.replace(/\s+/g, "-")}`}
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted sm:mb-4 sm:text-xs"
      >
        {title}
      </h2>
      <div className="min-w-0 text-sm text-text-primary">{children}</div>
    </section>
  );
}
