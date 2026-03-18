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

export default function TutorCard({ teachers, className = "", action }: Props) {
  const tutorItems = normalizeTutors(teachers);
  const router = useRouter();

  return (
    <ClassCard title="Gia sư phụ trách" className={className} action={action}>
      {tutorItems.length > 0 ? (
        <div className="space-y-2.5 sm:space-y-3">
          {tutorItems.map((teacher, index) => (
            <div
              key={teacher.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/admin/staffs/${encodeURIComponent(teacher.id)}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/admin/staffs/${encodeURIComponent(teacher.id)}`);
                }
              }}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border-default bg-bg-secondary/70 px-3 py-2.5 transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:px-4 sm:py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-surface text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary sm:size-10">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-muted sm:text-xs sm:tracking-[0.2em]">
                  Tutor {String(index + 1).padStart(2, "0")}
                </p>
                <p className="truncate text-sm font-semibold text-text-primary sm:text-sm">{teacher.name}</p>
              </div>
              <div
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] sm:px-3 sm:py-1 sm:text-xs ${
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
        <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/50 px-4 py-6 text-center text-sm text-text-muted">
          Chưa phân công gia sư phụ trách.
        </div>
      )}
    </ClassCard>
  );
}
