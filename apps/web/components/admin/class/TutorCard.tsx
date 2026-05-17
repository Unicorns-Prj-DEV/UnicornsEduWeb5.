"use client";

import { useRouter } from "next/navigation";
import { ClassTeacher } from "@/dtos/class.dto";
import { formatCurrency } from "@/lib/class.helpers";
import ClassCard from "./ClassCard";

const TEACHER_STATUS_LABELS = {
  active: "Đang hoạt động",
  inactive: "Ngưng hoạt động",
} as const;

type TutorItem = {
  id: string;
  name: string;
  status: string | null;
  customAllowance: number | null;
  operatingDeductionRatePercent: number | null;
};

type Props = {
  teachers?: ClassTeacher[];
  /** Class default allowance per student per session (VNĐ). Used when teacher has no custom override. */
  defaultAllowancePerStudent?: number | null;
  className?: string;
  action?: React.ReactNode;
  enableTeacherNavigation?: boolean;
};

function normalizeMoneyAmount(value?: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function normalizeRatePercent(value?: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function formatRatePercent(ratePercent?: number | null): string {
  const normalized = normalizeRatePercent(ratePercent) ?? 0;
  return `${normalized.toFixed(2)}%`;
}

function resolveEffectiveAllowance(
  customAllowance: number | null,
  defaultAllowancePerStudent?: number | null,
): number | null {
  const custom = normalizeMoneyAmount(customAllowance);
  if (custom != null) return custom;
  return normalizeMoneyAmount(defaultAllowancePerStudent);
}

function normalizeTutors(
  teachers?: ClassTeacher[],
  defaultAllowancePerStudent?: number | null,
): TutorItem[] {
  if (!Array.isArray(teachers)) return [];

  return teachers.reduce<TutorItem[]>((acc, teacher) => {
    const name = teacher?.fullName?.trim() || "";
    if (!name) return acc;

    const operatingDeductionRatePercent = normalizeRatePercent(
      teacher.operatingDeductionRatePercent ?? teacher.taxRatePercent ?? null,
    );

    return [
      ...acc,
      {
        id: teacher.id,
        name,
        status:
          teacher.status && teacher.status in TEACHER_STATUS_LABELS
            ? TEACHER_STATUS_LABELS[teacher.status]
            : null,
        customAllowance: resolveEffectiveAllowance(
          normalizeMoneyAmount(teacher.customAllowance),
          defaultAllowancePerStudent,
        ),
        operatingDeductionRatePercent,
      },
    ];
  }, []);
}

export default function TutorCard({
  teachers,
  defaultAllowancePerStudent,
  className = "",
  action,
  enableTeacherNavigation = true,
}: Props) {
  const tutorItems = normalizeTutors(teachers, defaultAllowancePerStudent);
  const { push } = useRouter();

  return (
    <ClassCard title="Gia sư phụ trách" className={className} action={action}>
      {tutorItems.length > 0 ? (
        <div className="space-y-1.5">
          {tutorItems.map((teacher, index) => (
            <div
              key={teacher.id}
              role="button"
              tabIndex={enableTeacherNavigation ? 0 : -1}
              aria-disabled={!enableTeacherNavigation}
              onClick={
                enableTeacherNavigation
                  ? () => push(`/admin/staffs/${encodeURIComponent(teacher.id)}`)
                  : undefined
              }
              onKeyDown={
                enableTeacherNavigation
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        push(`/admin/staffs/${encodeURIComponent(teacher.id)}`);
                      }
                    }
                  : undefined
              }
              className={`rounded-lg border border-border-default bg-bg-secondary/70 px-2.5 py-2 transition-colors sm:px-3 sm:py-2.5 ${
                enableTeacherNavigation
                  ? "cursor-pointer hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-default bg-bg-surface text-[10px] font-semibold tabular-nums text-text-secondary">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight text-text-primary">
                    {teacher.name}
                  </p>
                </div>
                <div
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] ${
                    teacher.status === "Đang hoạt động"
                      ? "border-success/30 bg-success/10 text-success"
                      : teacher.status === "Ngưng hoạt động"
                        ? "border-error/30 bg-error/10 text-error"
                        : "border-border-default bg-bg-surface text-text-secondary"
                  }`}
                >
                  {teacher.status ?? "Đang phân công"}
                </div>
              </div>
              <div
                className="mt-2 grid grid-cols-2 gap-2 border-t border-border-default/70 pt-2"
                role="presentation"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Trợ cấp
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(teacher.customAllowance)}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    Vận hành
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">
                    {formatRatePercent(teacher.operatingDeductionRatePercent)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/50 px-3 py-4 text-center text-xs text-text-muted">
          Chưa phân công gia sư phụ trách.
        </div>
      )}
    </ClassCard>
  );
}
