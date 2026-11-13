import StaffCard from "@/components/admin/staff/StaffCard";
import TutorClassChips from "@/components/staff/tutors/TutorClassChips";
import type { TrainingTutorClass } from "@/dtos/training-tutor.dto";

/**
 * «Lớp phụ trách» theo bố cục `/admin/staffs/:id` nhưng không có cột tiền
 * (#270): chỉ tên lớp đang dạy và lớp đã nghỉ.
 */
export default function TrainingTutorClassesCard({
  currentClasses,
  pastClasses,
}: {
  currentClasses: TrainingTutorClass[];
  pastClasses: TrainingTutorClass[];
}) {
  return (
    <StaffCard title="Lớp phụ trách">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-text-muted">
            Đang dạy ({currentClasses.length})
          </h3>
          <TutorClassChips classes={currentClasses} emptyLabel="Chưa có lớp." />
        </div>
        <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
          <h3 className="text-xs font-medium text-text-muted">
            Đã nghỉ ({pastClasses.length})
          </h3>
          <TutorClassChips classes={pastClasses} emptyLabel="Chưa có lớp." />
        </div>
        <p className="text-xs text-text-muted">
          Học phí, trợ cấp theo lớp chỉ Admin / Kế toán chi xem.
        </p>
      </div>
    </StaffCard>
  );
}
