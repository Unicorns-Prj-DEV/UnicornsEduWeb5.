export default function ClassListTableSkeleton({ rows = 8 }: { rows?: number }) {
  const skeletonRows = Array.from({ length: rows });

  return (
    <div className="space-y-3" aria-hidden>
      <div className="space-y-3 sm:hidden">
        {skeletonRows.map((_, i) => (
          <article
            key={i}
            className="rounded-xl border border-border-default bg-bg-surface p-3 text-left shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="block h-5 w-full max-w-[12rem] animate-pulse rounded bg-bg-tertiary" />
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <span className="inline-flex h-7 w-24 animate-pulse rounded-full bg-bg-tertiary" />
                <span className="inline-flex min-h-10 min-w-10 animate-pulse rounded-md bg-bg-tertiary" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-[56px_1fr] gap-x-2 gap-y-1 text-xs">
              <span className="text-text-muted">Loại</span>
              <span className="h-4 w-16 animate-pulse rounded bg-bg-tertiary" />
              <span className="text-text-muted">Sĩ số</span>
              <span className="h-5 w-24 animate-pulse rounded-full bg-bg-tertiary" />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <caption className="sr-only">Đang tải danh sách lớp học</caption>
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary/80">
              <th scope="col" className="w-8 px-2 py-3" aria-label="Trạng thái" />
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Tên lớp
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Loại lớp
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Sĩ số / tối đa
              </th>
              <th scope="col" className="w-16 px-4 py-3">
                <span className="sr-only">Xóa</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((_, i) => (
              <tr key={i} className="border-b border-border-default bg-bg-surface">
                <td className="px-2 py-3 align-middle">
                  <span className="inline-block size-2 shrink-0 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="min-w-0 px-4 py-3">
                  <span className="block h-5 w-full max-w-[12rem] animate-pulse rounded bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex h-5 w-20 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex h-7 min-w-[5.75rem] animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <span className="inline-block size-7 animate-pulse rounded bg-bg-tertiary" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
