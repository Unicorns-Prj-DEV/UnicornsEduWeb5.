"use client";

import type { RegulationAudience } from "@/dtos/regulation.dto";
import { REGULATION_AUDIENCE_OPTIONS } from "@/lib/regulation.constants";

type Props = {
  value: RegulationAudience[];
  onChange: (nextValue: RegulationAudience[]) => void;
};

export default function RegulationAudienceSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted">Có thể chọn nhiều đối tượng hiển thị.</p>
      <div className="flex flex-wrap gap-2">
        {REGULATION_AUDIENCE_OPTIONS.map((option) => {
          const isSelected = value.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onChange(
                  isSelected
                    ? value.filter((item) => item !== option.value)
                    : [...value, option.value],
                );
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                isSelected
                  ? "border-primary bg-primary text-text-inverse"
                  : "border-border-default bg-bg-surface text-text-secondary hover:border-border-focus hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
