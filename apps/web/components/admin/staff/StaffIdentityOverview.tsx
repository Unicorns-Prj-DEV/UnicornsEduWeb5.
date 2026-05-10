"use client";

import { useId, useMemo, type ReactNode } from "react";
import StaffQrCard from "./StaffQrCard";

/** Strip common wrapper quotes and trim lines (fixes pasted "…" blocks). */
function normalizeSpecializationRaw(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^[\s"'“”]+|[\s"'“”]+$/g, "");
  return s;
}

function parseSpecializationLines(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  const body = normalizeSpecializationRaw(raw);
  return body
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*[•\-\*\u2022]\s*/, "")
        .replace(/^[\s"'“”]+|[\s"'“”]+$/g, "")
        .trim(),
    )
    .filter(Boolean);
}

function InlineFact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  const display =
    value === undefined || value === null || value === "" ? "—" : value;
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5">
      <span className="shrink-0 text-sm text-text-secondary">{label}</span>
      <span className="min-w-0 text-sm text-text-primary">{display}</span>
    </span>
  );
}

function StaffAchievementsList({
  text,
  labelledBy,
}: {
  text?: string | null;
  labelledBy: string;
}) {
  const lines = useMemo(() => parseSpecializationLines(text ?? ""), [text]);

  if (lines.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-text-muted">
        Chưa có thành tích chuyên môn.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5" aria-labelledby={labelledBy}>
      {lines.map((line, i) => (
        <li
          key={i}
          className="flex gap-3 text-sm leading-relaxed text-text-primary"
        >
          <span
            className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
            aria-hidden
          />
          <span className="min-w-0">{line}</span>
        </li>
      ))}
    </ul>
  );
}

/** Matches in-page section titles e.g. "Thống kê thu nhập". */
const SECTION_HEADING =
  "text-sm font-semibold uppercase tracking-wide text-text-primary";

export type StaffIdentityOverviewProps = {
  birthDateLabel: string;
  province: React.ReactNode;
  university?: string | null;
  specialization?: string | null;
  personalAchievementLink?: string | null;
  qrLink: string | null;
  onQrEdit: () => void;
  /** When false, QR block is view-only (no edit / add link). Default true. */
  allowQrEdit?: boolean;
};

export default function StaffIdentityOverview({
  birthDateLabel,
  province,
  university,
  specialization,
  personalAchievementLink,
  qrLink,
  onQrEdit,
  allowQrEdit = true,
}: StaffIdentityOverviewProps) {
  const sectionTitleId = useId();
  const achievementsTitleId = useId();

  const trimmedAchievementLink = personalAchievementLink?.trim() || null;

  return (
    <section
      className="rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5"
      aria-labelledby={sectionTitleId}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={sectionTitleId} className={`min-w-0 flex-1 ${SECTION_HEADING}`}>
          Hồ sơ nhân sự
        </h2>
        <StaffQrCard
          qrLink={qrLink}
          onEditClick={onQrEdit}
          size="minimal"
          embedded
          className="shrink-0"
          allowEdit={allowQrEdit}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1.5 sm:gap-x-2.5">
        <InlineFact label="Ngày sinh" value={birthDateLabel} />
        <span className="select-none text-text-muted/30" aria-hidden>
          ·
        </span>
        <InlineFact label="Tỉnh / TP" value={province} />
        <span className="select-none text-text-muted/30" aria-hidden>
          ·
        </span>
        <InlineFact label="Trường ĐH" value={university?.trim()} />
      </div>

      {trimmedAchievementLink ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="shrink-0 text-text-secondary">Thành tích cá nhân:</span>
          <a
            href={trimmedAchievementLink}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
            title={trimmedAchievementLink}
          >
            Xem thành tích
          </a>
        </div>
      ) : null}

      <div className="mt-5 border-t border-border-default pt-4">
        <h3 id={achievementsTitleId} className={SECTION_HEADING}>
          Thành tích chuyên môn
        </h3>
        <div className="mt-3 rounded-lg border border-border-default bg-bg-secondary/40 px-3 py-3 sm:px-4 sm:py-4">
          <StaffAchievementsList
            text={specialization}
            labelledBy={achievementsTitleId}
          />
        </div>
      </div>
    </section>
  );
}
