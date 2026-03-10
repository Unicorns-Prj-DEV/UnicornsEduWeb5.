export function LandingMetricPreview() {
  return (
    <div className="motion-fade-up rounded-2xl border border-border-default bg-bg-surface p-5 my-auto shadow-sm motion-hover-lift lg:p-6">
      <p className="mb-3 text-sm font-medium text-text-secondary">Live snapshot</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2">
          <span className="text-sm text-text-secondary">Lớp đang học</span>
          <span className="text-sm font-semibold text-text-primary">18 lớp</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2">
          <span className="text-sm text-text-secondary">Buổi học hôm nay</span>
          <span className="text-sm font-semibold text-text-primary">42 phiên</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2">
          <span className="text-sm text-text-secondary">Tỷ lệ hoàn thành</span>
          <span className="text-sm font-semibold text-success">96%</span>
        </div>
      </div>
    </div>
  );
}
