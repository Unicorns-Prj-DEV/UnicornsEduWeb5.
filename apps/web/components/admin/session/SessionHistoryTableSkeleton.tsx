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
    <div className={`overflow-x-auto ${className}`} aria-hidden>
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
                {renderEntityHeader(entityMode)}
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
  );
}
