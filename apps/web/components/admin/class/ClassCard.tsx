export default function ClassCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:border-border-default sm:p-5 ${className}`}
      aria-labelledby={`card-${title.replace(/\s+/g, "-")}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id={`card-${title.replace(/\s+/g, "-")}`}
          className="text-sm font-semibold uppercase tracking-wide text-text-muted"
        >
          {title}
        </h2>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
      <div className="text-sm text-text-primary">{children}</div>
    </section>
  );
}
