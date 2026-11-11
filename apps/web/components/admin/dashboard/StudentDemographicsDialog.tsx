"use client";

import { type ReactNode, useId, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import {
  downloadAdminStudentDemographicsPdf,
  getAdminStudentDemographics,
} from "@/lib/apis/dashboard.api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatVnDong, formatVnInteger } from "@/lib/formatters";
import { CourseBreakdownTab } from "./student-demographics/CourseBreakdownTab";
import { DataQualityTab } from "./student-demographics/DataQualityTab";
import {
  DemographicsMatrixTable,
  type DemographicsMatrixMode,
  type DemographicsMatrixRow,
} from "./student-demographics/DemographicsMatrixTable";

type DemographicsTab = "courses" | "hierarchy" | "provinceMatrix" | "birthYearMatrix" | "review";

function KpiTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="@container min-w-0 rounded-xl border border-border-default bg-bg-surface p-3 shadow-xs sm:p-4">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</dt>
      {/* Cỡ chữ co theo bề rộng ô (cqi) để số tiền tới 10 chữ số (1.234.567.890 đ) không bị tràn/cắt. */}
      <dd className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.75rem,11cqi,1.25rem)] font-bold tabular-nums text-text-primary">
        {value}
      </dd>
      {sub ? <p className="mt-0.5 line-clamp-2 text-[11px] text-text-secondary sm:text-xs">{sub}</p> : null}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message === "string"
  ) {
    return (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message as string;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Không thể tải số liệu thống kê học sinh.";
}

export function StudentDemographicsDialog({
  initialStatus = "all",
  onClose,
}: {
  initialStatus?: "all" | "active" | "inactive";
  onClose: () => void;
}) {
  const titleId = useId();
  const [status, setStatus] = useState<"all" | "active" | "inactive">(initialStatus);
  const [activeTab, setActiveTab] = useState<DemographicsTab>("courses");
  const [matrixMode, setMatrixMode] = useState<DemographicsMatrixMode>("count");
  const currentYear = new Date().getFullYear();
  const [search, setSearch] = useState("");

  const demographicsQuery = useQuery({
    queryKey: ["dashboard", "admin", "student-demographics", status],
    queryFn: () => getAdminStudentDemographics(status),
    staleTime: 30_000,
  });

  const exportPdfMutation = useMutation({
    mutationFn: (s: "all" | "active" | "inactive") =>
      downloadAdminStudentDemographicsPdf(s),
    onMutate: () => ({ toastId: toast.loading("Đang tạo file PDF báo cáo học sinh…") }),
    onSuccess: ({ blob, filename }, _vars, context) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xong file PDF báo cáo học sinh.", { id: context?.toastId });
    },
    onError: (error, _vars, context) => {
      const message = error instanceof Error ? error.message : "Lỗi khi xuất PDF.";
      toast.error(message, { id: context?.toastId });
    },
  });

  const data = demographicsQuery.data;

  const term = search.trim().toLowerCase();

  // Filtered provinces for hierarchy
  const filteredProvinces = useMemo(() => {
    if (!data) return [];
    if (!term) return data.byProvince;
    return data.byProvince.filter(
      (p) =>
        p.province.toLowerCase().includes(term) ||
        p.birthYears.some((by) => by.label.toLowerCase().includes(term)) ||
        p.categories.some((c) => c.courseName.toLowerCase().includes(term)),
    );
  }, [data, term]);

  const provinceMatrixRows = useMemo<DemographicsMatrixRow[]>(() => {
    if (!data) return [];
    return data.provinceMatrix.rows
      .filter((r) => !term || r.province.toLowerCase().includes(term))
      .map((r) => ({ ...r, key: r.province, label: r.province }));
  }, [data, term]);

  const birthYearMatrixRows = useMemo<DemographicsMatrixRow[]>(() => {
    if (!data) return [];
    return data.birthYearMatrix.rows
      .filter((r) => !term || r.label.toLowerCase().includes(term))
      .map((r) => ({ ...r, key: String(r.birthYear ?? "none") }));
  }, [data, term]);

  const showSearch = activeTab === "hierarchy" || activeTab === "provinceMatrix" || activeTab === "birthYearMatrix";
  const showMatrixMode = activeTab === "provinceMatrix" || activeTab === "birthYearMatrix";

  return (
    <ResponsiveDialog
      labelledBy={titleId}
      onBackdropClick={onClose}
      size="full"
      contentClassName="sm:h-[calc(100dvh-2rem)]"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border-default px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold text-text-primary sm:text-lg">
              Thống kê học sinh
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Khu vực · độ tuổi · khoá học · doanh thu —{" "}
              {status === "all"
                ? "tất cả học sinh (cả đã nghỉ)"
                : status === "inactive"
                  ? "học sinh đã nghỉ"
                  : "học sinh đang học"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 -mt-0.5 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus lg:hidden"
            aria-label="Đóng thống kê học sinh"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status selector */}
          <div className="inline-flex flex-1 rounded-lg border border-border-default bg-bg-secondary/60 p-0.5 lg:flex-none">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "active", label: "Đang học" },
                { key: "inactive", label: "Đã nghỉ" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatus(opt.key)}
                aria-pressed={status === opt.key}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  status === opt.key
                    ? "bg-bg-surface text-text-primary shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => exportPdfMutation.mutate(status)}
            disabled={exportPdfMutation.isPending || !data}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
          >
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exportPdfMutation.isPending ? "Đang xuất…" : "Xuất PDF"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hidden rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus lg:inline-flex"
            aria-label="Đóng thống kê học sinh"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <ResponsiveDialogBody className="space-y-4 bg-bg-secondary/20 p-4 sm:p-6">
        {demographicsQuery.isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-bg-secondary/40" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-bg-secondary/30" />
          </div>
        ) : demographicsQuery.isError ? (
          <Alert variant="destructive">
            <AlertTitle>Không thể tải số liệu thống kê</AlertTitle>
            <AlertDescription>{getErrorMessage(demographicsQuery.error)}</AlertDescription>
          </Alert>
        ) : !data ? (
          <p className="text-sm text-text-secondary">Chưa có dữ liệu học sinh.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
              <KpiTile
                label={status === "all" ? "Tổng học sinh" : status === "inactive" ? "HS đã nghỉ" : "HS đang học"}
                value={formatVnInteger(data.summary.totalActiveStudents)}
                sub={`${formatVnInteger(data.summary.enrolledStudentsCount)} có lớp · ${formatVnInteger(data.summary.unenrolledStudentsCount)} chưa xếp lớp`}
              />
              <KpiTile
                label="Doanh thu"
                value={formatVnDong(data.summary.totalRevenue)}
                sub={`TB ${formatVnDong(data.summary.averageRevenue)}/HS có học`}
              />
              <KpiTile
                label="Tổng nạp"
                value={formatVnDong(data.summary.totalTopup)}
                sub={`TB ${formatVnDong(data.summary.averageTopup)}/HS`}
              />
              <KpiTile
                label="Độ tuổi"
                value={data.summary.averageAge != null ? `${data.summary.averageAge} tuổi TB` : "—"}
                sub={
                  data.summary.topBirthYear
                    ? `Đông nhất: ${data.summary.topBirthYear} (${currentYear - data.summary.topBirthYear}t)`
                    : "Chưa có năm sinh"
                }
              />
              <KpiTile
                label="Độ phủ địa bàn"
                value={`${data.summary.totalProvincesCount} tỉnh/TP`}
                sub={`Nhiều nhất: ${data.summary.topProvince || "—"}`}
              />
              <KpiTile
                label="Khoá học"
                value={`${data.summary.totalCategoriesCount} khoá`}
                sub={`DT cao nhất: ${data.summary.topRevenueCategory || "—"}`}
              />
            </dl>
            <p className="rounded-lg border border-dashed border-border-default bg-bg-surface/60 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
              <strong className="font-semibold text-text-secondary">Cách tính:</strong> Doanh thu = học phí đã học (buổi có mặt/vắng có phép), toàn thời gian, gán theo khoá của lớp có buổi
              học. Tổng nạp = tiền nạp ví, là dòng tiền vào, khác doanh thu.
            </p>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DemographicsTab)} className="gap-3">
              <div className="sticky -top-4 z-20 -mx-4 flex flex-col gap-2 border-b border-border-default bg-bg-surface/95 px-4 py-2 backdrop-blur sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
                  <TabsList className="w-max">
                    <TabsTrigger value="courses" className="text-xs">Theo khoá học</TabsTrigger>
                    <TabsTrigger value="hierarchy" className="text-xs">Tỉnh ➔ Tuổi ➔ Khoá</TabsTrigger>
                    <TabsTrigger value="provinceMatrix" className="text-xs">Tỉnh × Khoá</TabsTrigger>
                    <TabsTrigger value="birthYearMatrix" className="text-xs">Năm sinh × Khoá</TabsTrigger>
                    <TabsTrigger value="review" className="text-xs">
                      Cần rà soát ({data.summary.missingBirthYearCount + data.summary.unusualBirthYearCount})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {showMatrixMode ? (
                    <div className="inline-flex rounded-lg border border-border-default bg-bg-secondary/60 p-0.5">
                      {(
                        [
                          { key: "count", label: "Số HS" },
                          { key: "revenue", label: "Doanh thu" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setMatrixMode(opt.key)}
                          aria-pressed={matrixMode === opt.key}
                          className={`flex-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                            matrixMode === opt.key
                              ? "bg-bg-surface text-text-primary shadow-xs"
                              : "text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {showSearch ? (
                    <div className="relative w-full sm:w-64">
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Lọc theo tỉnh, năm sinh…"
                        aria-label="Lọc theo tỉnh, năm sinh"
                        className="h-8.5 w-full rounded-lg border border-border-default bg-bg-surface pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                      />
                      <svg className="absolute left-2.5 top-2.5 size-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  ) : null}
                </div>
              </div>

              <TabsContent value="courses">
                <CourseBreakdownTab courses={data.byCourse} students={data.students} currentYear={currentYear} />
              </TabsContent>

              <TabsContent value="hierarchy">
                <div className="max-h-[70vh] overflow-auto rounded-xl border border-border-default bg-bg-surface">
                  <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-border-default bg-bg-secondary text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="px-3 py-2.5">Tỉnh / Thành phố</th>
                        <th className="px-3 py-2.5">Năm sinh (Độ tuổi)</th>
                        <th className="px-3 py-2.5 text-right">Số HS</th>
                        <th className="px-3 py-2.5 text-right">Doanh thu</th>
                        <th className="px-3 py-2.5 text-right">Tổng nạp</th>
                        <th className="px-3 py-2.5">Khoá đang theo học</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default bg-bg-surface">
                      {filteredProvinces.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-text-muted">
                            Không tìm thấy kết quả phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredProvinces.map((prov) =>
                          prov.birthYears.map((by, idx) => (
                            <tr key={`${prov.province}-${by.birthYear ?? "none"}`} className="hover:bg-bg-secondary/25">
                              {idx === 0 ? (
                                <td
                                  rowSpan={prov.birthYears.length}
                                  className="border-r border-border-default bg-bg-secondary/15 px-3 py-2.5 align-top"
                                >
                                  <span className="font-semibold text-text-primary">{prov.province}</span>
                                  <span className="block text-[11px] text-text-secondary">
                                    {formatVnInteger(prov.studentCount)} HS ({prov.percentage}%)
                                  </span>
                                  <span className="block text-[11px] text-text-secondary">
                                    DT {formatVnDong(prov.totalRevenue)}
                                  </span>
                                  <span className="block text-[11px] text-text-muted">
                                    Nạp {formatVnDong(prov.totalTopup)}
                                  </span>
                                </td>
                              ) : null}
                              <td className="px-3 py-2 font-medium text-text-primary">{by.label}</td>
                              <td className="px-3 py-2 text-right font-bold tabular-nums text-text-primary">{by.studentCount}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-text-primary">
                                {formatVnInteger(by.totalRevenue)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                                {formatVnInteger(by.totalTopup)}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {by.categories.map((c) => (
                                    <span
                                      key={c.courseId ?? "unassigned"}
                                      className="inline-flex items-center gap-1 rounded-md border border-border-default bg-bg-secondary/40 px-2 py-0.5 text-[11px] text-text-primary"
                                    >
                                      <span className="font-semibold">{c.courseName}:</span>
                                      <span className="tabular-nums">{c.studentCount}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )),
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="provinceMatrix">
                <DemographicsMatrixTable
                  firstHeader="Tỉnh / Thành phố"
                  columns={data.provinceMatrix.columns}
                  rows={provinceMatrixRows}
                  mode={matrixMode}
                  emptyText="Không tìm thấy tỉnh thành phù hợp."
                />
              </TabsContent>

              <TabsContent value="birthYearMatrix">
                <DemographicsMatrixTable
                  firstHeader="Năm sinh (Độ tuổi)"
                  columns={data.birthYearMatrix.columns}
                  rows={birthYearMatrixRows}
                  mode={matrixMode}
                  emptyText="Không tìm thấy năm sinh phù hợp."
                />
              </TabsContent>

              <TabsContent value="review">
                <DataQualityTab dataQuality={data.dataQuality} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
