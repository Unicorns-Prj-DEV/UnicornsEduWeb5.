type SessionEntityMode = "teacher" | "class" | "none";

type Props = {
  rows?: number;
  entityMode?: SessionEntityMode;
  className?: string;
  /** Khi true, skeleton có cột Thao tác để khớp layout với bảng thật. */
  showActionsColumn?: boolean;
};

function renderEntityHeader(entityMode: Exclude<SessionEntityMode, "none">): string {
  if (entityMode === "teacher") {
    return "Gia sư";
  }

  return "Lớp";
}

export default function SessionHistoryTableSkeleton({
  rows = 1,
  entityMode = "none",
  className = "",
  showActionsColumn = false,
}: Props) {
  const shouldShowEntity = entityMode !== "none";
  const isTeacher = entityMode === "teacher";

  return (
    <div className={className} aria-hidden>
      {/* Mobile skeleton: card list */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <article
            key={rowIndex}
            className="rounded-lg border border-border-default bg-bg-surface p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Ngày học
                  </p>
                  <span className="mt-1 inline-block h-5 w-24 animate-pulse rounded bg-bg-tertiary" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Giờ học
                  </p>
                  <span className="mt-1 inline-block h-5 w-20 animate-pulse rounded bg-bg-tertiary" />
                </div>
                {shouldShowEntity && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      {renderEntityHeader(entityMode as Exclude<SessionEntityMode, "none">)}
                    </p>
                    <span className="mt-1 inline-block h-5 w-28 animate-pulse rounded bg-bg-tertiary" />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-block h-5 w-24 animate-pulse rounded-full bg-bg-tertiary" />
                {showActionsColumn && (
                  <span className="inline-block h-5 w-10 animate-pulse rounded bg-bg-tertiary" />
                )}
              </div>
            </div>
            {isTeacher && (
              <div className="mt-3 border-t border-border-subtle pt-2">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                  Ghi chú
                </p>
                <div className="space-y-1">
                  <span className="block h-3 w-5/6 animate-pulse rounded bg-bg-tertiary" />
                  <span className="block h-3 w-2/3 animate-pulse rounded bg-bg-tertiary" />
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Desktop / tablet skeleton: table */}
      <div className="hidden overflow-x-auto md:block">
        <table
          className={
            entityMode === "class"
              ? "w-full min-w-[400px] table-fixed border-collapse text-left text-sm"
              : "w-full min-w-[520px] border-collapse text-left text-sm"
          }
        >
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th className="px-4 py-3 font-medium text-text-primary">Ngày học</th>
              {isTeacher ? (
                <th className="px-4 py-3 font-medium text-text-primary">Note</th>
              ) : null}
              <th className="px-4 py-3 font-medium text-text-primary">Giờ học</th>
              {shouldShowEntity ? (
                <th className="px-4 py-3 font-medium text-text-primary">
                  {renderEntityHeader(entityMode as Exclude<SessionEntityMode, "none">)}
                </th>
              ) : null}
              <th className="px-4 py-3 font-medium text-text-primary">Trạng thái</th>
              {showActionsColumn ? (
                <th className="w-12 px-2 py-3 font-medium text-text-primary" aria-hidden>
                  <span className="sr-only">Thao tác</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border-default bg-bg-surface">
                <td className="px-4 py-3">
                  <span className="inline-block h-5 w-24 animate-pulse rounded bg-bg-tertiary" />
                </td>
                {isTeacher ? (
                  <td className="px-4 py-3">
                    <span className="inline-block h-5 w-20 animate-pulse rounded bg-bg-tertiary" />
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <span className="inline-block h-5 w-20 animate-pulse rounded bg-bg-tertiary" />
                </td>
                {shouldShowEntity ? (
                  <td className="px-4 py-3">
                    <span className="inline-block h-5 w-28 animate-pulse rounded bg-bg-tertiary" />
                  </td>
                ) : null}
                <td className="px-4 py-3">
                  <span className="inline-block h-5 w-24 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                {showActionsColumn ? (
                  <td className="px-2 py-3">
                    <span className="inline-block h-5 w-8 animate-pulse rounded bg-bg-tertiary" />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
