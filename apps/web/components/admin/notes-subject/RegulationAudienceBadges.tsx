"use client";

import type { RegulationAudience } from "@/dtos/regulation.dto";
import { REGULATION_AUDIENCE_LABELS } from "@/lib/regulation.constants";

type Props = {
  audiences: RegulationAudience[];
};

export default function RegulationAudienceBadges({ audiences }: Props) {
  if (!audiences.length) {
    return <span className="text-sm text-text-muted">Chưa gắn role</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {audiences.map((audience) => (
        <span
          key={audience}
          className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
        >
          {REGULATION_AUDIENCE_LABELS[audience] ?? audience}
        </span>
      ))}
    </div>
  );
}
