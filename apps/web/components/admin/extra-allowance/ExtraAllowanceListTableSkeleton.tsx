export default function ExtraAllowanceListTableSkeleton({
  rows = 8,
}: {
  rows?: number;
}) {
  return (
    <div className="overflow-x-auto" aria-hidden>
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th className="w-14 px-4 py-3" />
            <th className="px-4 py-3 font-medium text-text-primary">Nhân sự</th>
            <th className="px-4 py-3 font-medium text-text-primary">Vai trò</th>
            <th className="px-4 py-3 font-medium text-text-primary">Tháng</th>
            <th className="px-4 py-3 font-medium text-text-primary">Ghi chú</th>
            <th className="px-4 py-3 font-medium text-text-primary">Trạng thái</th>
            <th className="px-4 py-3 font-medium text-text-primary">Số tiền</th>
            <th className="w-24 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-border-default bg-bg-surface"
            >
              {Array.from({ length: 8 }).map((__, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  <span className="inline-block h-5 w-full max-w-[8rem] animate-pulse rounded bg-bg-tertiary" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
