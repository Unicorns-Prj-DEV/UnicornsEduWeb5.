export default function ClassesListTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto" aria-hidden>
      <table className="w-full min-w-[400px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th className="w-8 px-2 py-3" aria-label="Trạng thái" />
            <th className="px-4 py-3 font-medium text-text-primary">Lớp</th>
            <th className="px-4 py-3 font-medium text-text-primary">Gia sư</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-border-default bg-bg-surface">
              <td className="px-2 py-3">
                <span className="inline-block size-2 shrink-0 animate-pulse rounded-full bg-bg-tertiary" />
              </td>
              <td className="px-4 py-3">
                <span className="inline-block h-5 w-full max-w-[8rem] animate-pulse rounded bg-bg-tertiary" />
              </td>
              <td className="px-4 py-3">
                <span className="inline-block h-5 w-full max-w-[10rem] animate-pulse rounded bg-bg-tertiary" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
