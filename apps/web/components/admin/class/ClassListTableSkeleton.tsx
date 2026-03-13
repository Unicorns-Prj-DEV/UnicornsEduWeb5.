export default function ClassListTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto" aria-hidden>
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th className="w-8 px-2 py-3" />
            <th className="px-4 py-3 font-medium text-text-primary">Tên lớp</th>
            <th className="px-4 py-3 font-medium text-text-primary">Loại</th>
            <th className="px-4 py-3 font-medium text-text-primary">Trạng thái</th>
            <th className="px-4 py-3 font-medium text-text-primary">Sĩ số tối đa</th>
            <th className="px-4 py-3 font-medium text-text-primary">Học phí/buổi</th>
            <th className="w-20 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-border-default bg-bg-surface">
              {Array.from({ length: 7 }).map((__, j) => (
                <td key={j} className="px-4 py-3">
                  <span className="inline-block h-5 w-full max-w-[7rem] animate-pulse rounded bg-bg-tertiary" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
