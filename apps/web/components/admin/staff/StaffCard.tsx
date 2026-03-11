export default function StaffCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm transition-colors hover:border-border-default sm:p-5 ${className}`}
      aria-labelledby={`card-${title.replace(/\s+/g, "-")}`}
    >
      <h2
        id={`card-${title.replace(/\s+/g, "-")}`}
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted"
      >
        {title}
      </h2>
      <div className="text-sm text-text-primary">{children}</div>
    </section>
  );
}
