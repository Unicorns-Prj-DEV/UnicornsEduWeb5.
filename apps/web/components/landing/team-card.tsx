interface TeamCardProps {
  icon: string;
  name: string;
  description: string;
  link: string;
  focus: string;
  animationDelay: string;
}

export function TeamCard({
  icon,
  name,
  description,
  link,
  focus,
  animationDelay,
}: TeamCardProps) {
  return (
    <article
      className="motion-fade-up motion-hover-lift flex flex-col rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm"
      style={{ animationDelay }}
    >
      <div className="mb-4 text-3xl" aria-hidden>
        {icon}
      </div>
      <p className="mb-3 inline-flex w-fit rounded-full border border-border-subtle bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
        {focus}
      </p>
      <h3 className="mb-2 text-lg font-semibold">{name}</h3>
      <p className="mb-4 flex-1 text-sm text-text-secondary">{description}</p>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
      >
        Xem Fanpage
      </a>
    </article>
  );
}
