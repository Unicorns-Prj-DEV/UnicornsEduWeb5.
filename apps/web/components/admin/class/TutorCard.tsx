"use client";

import { useRouter } from "next/navigation";
import { ClassTeacher } from "@/dtos/class.dto";
import ClassCard from "./ClassCard";

const TEACHER_STATUS_LABELS = {
  active: "Đang hoạt động",
  inactive: "Ngưng hoạt động",
} as const;

type TutorItem = {
  id: string;
  name: string;
  status: string | null;
};

type Props = {
  teachers?: ClassTeacher[];
  className?: string;
  action?: React.ReactNode;
  enableTeacherNavigation?: boolean;
};

function normalizeTutors(teachers?: ClassTeacher[]): TutorItem[] {
  if (!Array.isArray(teachers)) return [];

  return teachers.reduce<TutorItem[]>((acc, teacher) => {
    const name = teacher?.fullName?.trim() || "";
    if (!name) return acc;

    return [
      ...acc,
      {
        id: teacher.id,
        name,
        status:
          teacher.status && teacher.status in TEACHER_STATUS_LABELS
            ? TEACHER_STATUS_LABELS[teacher.status]
            : null,
      },
    ];
  }, []);
}

export default function TutorCard({
  teachers,
  className = "",
  action,
  enableTeacherNavigation = true,
}: Props) {
  const tutorItems = normalizeTutors(teachers);
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
              className={`flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary/70 px-2.5 py-1.5 transition-colors sm:gap-2.5 sm:px-3 sm:py-2 ${
                enableTeacherNavigation
                  ? "cursor-pointer hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  : "cursor-default"
              }`}
            >
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
