import type { ClassDetail } from "@/dtos/class.dto";
import { formatCurrency } from "@/lib/class.helpers";
import ClassCard from "./ClassCard";

type Props = {
  classDetail: Pick<
    ClassDetail,
    | "pricingMode"
    | "studentTuitionPerSession"
    | "studentTuitionPerBlock"
    | "tuitionPackageTotal"
    | "tuitionPackageSession"
  >;
  /** Admin / Trưởng phòng Sale & CSKH (#272). Kế toán thu chỉ xem. */
  canEdit: boolean;
  onEdit: () => void;
  className?: string;
};

function TuitionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border-default bg-bg-secondary/50 px-3 py-2">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="font-medium tabular-nums text-text-primary">{value}</dd>
    </div>
  );
}

/** **Học phí lớp** (#272): học phí chung của lớp, tách khỏi Thông tin lớp. */
export default function ClassTuitionCard({ classDetail, canEdit, onEdit, className }: Props) {
  const isPerBlock = classDetail.pricingMode === "per_block";
  return (
    <ClassCard
      title="Học phí lớp"
      className={className}
      action={
        canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:w-auto"
          >
            Chỉnh sửa
          </button>
        ) : null
      }
    >
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TuitionStat label="Tổng gói" value={formatCurrency(classDetail.tuitionPackageTotal)} />
        <TuitionStat
          label="Số buổi"
          value={classDetail.tuitionPackageSession == null ? "—" : String(classDetail.tuitionPackageSession)}
        />
        <TuitionStat
          label="Học phí / buổi"
          value={formatCurrency(classDetail.studentTuitionPerSession)}
        />
        {isPerBlock ? (
          <TuitionStat
            label="Học phí / 30 phút"
            value={formatCurrency(classDetail.studentTuitionPerBlock)}
          />
        ) : null}
      </dl>
    </ClassCard>
  );
}
