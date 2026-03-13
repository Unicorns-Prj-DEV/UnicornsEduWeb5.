"use client";

import { formatCurrency } from "@/lib/class.helpers";

export type MockBonus = {
  id: string;
  workType: string;
  status: "paid" | "unpaid" | "deposit";
  amount: number;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Đã thanh toán",
  deposit: "Cọc",
  unpaid: "Chờ thanh toán",
};

const STATUS_CLASS: Record<string, string> = {
  paid: "bg-success/15 text-success",
  deposit: "bg-warning/15 text-warning",
  unpaid: "bg-error/15 text-error",
};

type Props = {
  bonuses: MockBonus[];
  totalMonth: number;
  paid: number;
  unpaid: number;
  onAddBonus?: () => void;
  onEditBonus?: (bonus: MockBonus) => void;
  onDeleteBonus?: (id: string) => void;
  canManage?: boolean;
};

export default function StaffBonusCard({
  bonuses,
  totalMonth,
  paid,
  unpaid,
  onAddBonus,
  onEditBonus,
  onDeleteBonus,
  canManage = true,
}: Props) {
  return (
    <section
      className="rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5"
      aria-labelledby="bonus-section-title"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          id="bonus-section-title"
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-muted"
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          Thưởng tháng
        </h2>
        {canManage && onAddBonus && (
          <button
            type="button"
            onClick={onAddBonus}
            className="flex items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm thưởng
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-t-lg border border-border-default">
        <div className="grid grid-cols-3 gap-4 border-b border-border-default bg-bg-secondary px-4 py-4">
          <div>
            <div className="mb-1 text-xs font-medium text-text-secondary">Tổng tháng</div>
            <div className="text-lg font-semibold text-primary">{formatCurrency(totalMonth)}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-text-secondary">Đã nhận</div>
            <div className="text-lg font-semibold text-success">{formatCurrency(paid)}</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-text-secondary">Chưa nhận</div>
            <div className="text-lg font-semibold text-error">{formatCurrency(unpaid)}</div>
          </div>
        </div>

        {bonuses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-default bg-primary/5">
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Công việc
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Số tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map((b) => (
                  <tr
                    key={b.id}
                    className="cursor-pointer border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary"
                    onClick={() => canManage && onEditBonus?.(b)}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">{b.workType || "Khác"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[b.status] ?? "bg-bg-tertiary text-text-muted"}`}
                      >
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary">{formatCurrency(b.amount)}</span>
                        {canManage && onDeleteBonus && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Bạn có chắc muốn xóa thưởng này?")) {
                                onDeleteBonus(b.id);
                              }
                            }}
                            className="rounded p-1 text-text-muted transition-colors hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            aria-label={`Xóa thưởng ${b.workType}`}
                          >
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 border-t border-border-default bg-bg-surface px-4 py-8 text-center">
            <svg
              className="size-12 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <p className="text-sm text-text-muted">Chưa có thưởng nào trong tháng này.</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-text-muted">Dữ liệu mẫu. Sẽ kết nối API sau.</p>
    </section>
  );
}
