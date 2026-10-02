import Image from "next/image";
import Link from "next/link";
import type { StudentClassCard as StudentClassCardData } from "@/dtos/student-class.dto";
import { getClassMascot } from "@/lib/class-mascot";
import { cn } from "@/lib/utils";

export function StudentClassCard({ card }: { card: StudentClassCardData }) {
  const mascot = getClassMascot(card.classId);
  const teacherLabel =
    card.teacherNames.length > 0 ? card.teacherNames.join(", ") : "Chưa phân công";

  return (
    <Link
      href={`/student/classes/${card.classId}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div
        className={cn(
          "flex aspect-[16/9] items-center justify-center",
          mascot.tintClassName,
        )}
      >
        <div className="relative aspect-square h-3/4">
          <Image
            src={mascot.src}
            alt=""
            fill
            sizes="160px"
            className="object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-text-muted">
          {card.courseName}
        </p>
        <h2 className="line-clamp-2 text-base font-semibold text-text-primary transition-colors group-hover:text-primary">
          {card.className}
        </h2>
        <p className="mt-auto pt-2 text-sm text-text-secondary">
          <span className="text-text-muted">Gia sư: </span>
          {teacherLabel}
        </p>
      </div>
    </Link>
  );
}
