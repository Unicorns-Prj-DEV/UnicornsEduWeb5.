"use client";

type Props = {
  resourceLink: string | null | undefined;
  resourceLinkLabel?: string | null;
  className?: string;
};

export default function RegulationResourceLink({
  resourceLink,
  resourceLinkLabel,
  className,
}: Props) {
  if (!resourceLink) {
    return null;
  }

  return (
    <a
      href={resourceLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-secondary/60 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-border-focus hover:bg-bg-secondary ${className ?? ""}`.trim()}
    >
      <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.5 10.5 21 3m0 0h-5.25M21 3v5.25M10.5 6H6.75A2.25 2.25 0 0 0 4.5 8.25v9A2.25 2.25 0 0 0 6.75 19.5h9A2.25 2.25 0 0 0 18 17.25V13.5"
        />
      </svg>
      <span>{resourceLinkLabel?.trim() || "Mở tài nguyên"}</span>
    </a>
  );
}
