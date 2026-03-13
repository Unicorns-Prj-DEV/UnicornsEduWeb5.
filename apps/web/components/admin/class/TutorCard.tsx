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

export default function TutorCard({ teachers, className = "" }: Props) {
  const tutorItems = normalizeTutors(teachers);

  return (
    <ClassCard title="Gia sư phụ trách" className={className}>
      {tutorItems.length > 0 ? (
        <div className="space-y-3">
          {tutorItems.map((teacher, index) => (
            <div
              key={teacher.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-secondary px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted">
                  Tutor {String(index + 1).padStart(2, "0")}
                </p>
                <p className="truncate text-sm font-semibold text-text-primary">{teacher.name}</p>
              </div>
              <div className="shrink-0 rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs text-text-secondary">
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
