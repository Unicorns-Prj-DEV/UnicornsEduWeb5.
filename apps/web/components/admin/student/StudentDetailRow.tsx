import type { ReactNode } from "react";

export default function StudentDetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted sm:w-36 sm:text-sm sm:font-medium sm:normal-case sm:tracking-normal sm:text-text-secondary">
        {label}
      </dt>
      <dd className="min-w-0 break-words [overflow-wrap:anywhere] text-sm font-medium leading-6 text-text-primary sm:font-normal">
        {value ?? "—"}
      </dd>
    </div>
  );
}
