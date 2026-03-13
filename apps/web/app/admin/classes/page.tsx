"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useQuery } from "@tanstack/react-query";
import * as classesApi from "@/lib/apis/classes.api";
import { ClassesListTableSkeleton } from "@/components/admin/classes";

type ClassStatus = classesApi.ClassStatus;
type ClassListItem = classesApi.ClassListItem;
type ClassType = classesApi.ClassType;

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 500;

const STATUS_LABELS: Record<ClassStatus, string> = {
  running: "Đang hoạt động",
  ended: "Kết thúc",
};

/** Phân loại lớp – dropdown options (value "" = Tất cả) */
const CLASS_TYPE_OPTIONS: { value: "" | ClassType; label: string }[] = [
  { value: "", label: "Tất cả phân loại" },
  { value: "vip", label: "VIP" },
  { value: "basic", label: "Basic" },
  { value: "advance", label: "Advance" },
  { value: "hardcore", label: "Hardcore" },
];

function statusDotColor(status: ClassStatus): string {
  return status === "running" ? "bg-warning" : "bg-text-muted";
}

export default function AdminClassesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const filterType = (searchParams.get("type") ?? "") as "" | ClassType;
  const filterTeacher = searchParams.get("teacher") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<{ type: "" | ClassType; teacher: string }>({ type: "", teacher: "" });

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const applySearchToUrl = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("search", value);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }, SEARCH_DEBOUNCE_MS);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    applySearchToUrl(value);
  };

  const openFilterPopup = () => {
    setFilterDraft({ type: filterType, teacher: filterTeacher });
    setFilterPopupOpen(true);
  };

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");
    if (filterDraft.type) params.set("type", filterDraft.type);
    else params.delete("type");
    if (filterDraft.teacher.trim()) params.set("teacher", filterDraft.teacher.trim());
    else params.delete("teacher");
    router.replace(`${pathname}?${params.toString()}`);
    setFilterPopupOpen(false);
  };

  const clearFilter = () => {
    setFilterDraft({ type: "", teacher: "" });
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("type");
    params.delete("teacher");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
    setFilterPopupOpen(false);
  };

  const hasActiveFilter = !!(filterType || filterTeacher);

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
  } = useQuery<classesApi.ClassListResponse>({
    queryKey: ["classes", "list", page, PAGE_SIZE, search, filterType, filterTeacher],
    queryFn: () =>
      classesApi.getClasses({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        type: filterType || undefined,
        teacher: filterTeacher.trim() || undefined,
      }),
  });

  const list: ClassListItem[] = listResponse?.data ?? [];
  const total = listResponse?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildListParams = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    if (search) params.set("search", search);
    if (filterType) params.set("type", filterType);
    if (filterTeacher) params.set("teacher", filterTeacher);
    return params;
  };

  const handlePreviousPage = () => {
    router.replace(`${pathname}?${buildListParams(page - 1).toString()}`);
  };

  const handleNextPage = () => {
    router.replace(`${pathname}?${buildListParams(page + 1).toString()}`);
  };

  const tutorNames = (row: ClassListItem): string => {
    const names = row.teachers
      ?.map((t) => t.fullName?.trim())
      .filter(Boolean);
    return names?.length ? names.join(", ") : "—";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Lớp học</h1>
          <button
            type="button"
            className="rounded-md border border-border-default bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:opacity-50"
            disabled
            aria-label="Thêm lớp (sắp ra mắt)"
            title="Thêm lớp (sắp ra mắt)"
          >
            Thêm lớp
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
            <span className="shrink-0 text-sm font-medium text-text-secondary sm:w-24">Tìm kiếm</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Theo tên lớp…"
              className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              aria-label="Tìm theo tên lớp"
            />
          </label>
          <button
            type="button"
            onClick={openFilterPopup}
            className={`flex size-10 shrink-0 items-center justify-center rounded-md border border-border-default bg-bg-surface transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${hasActiveFilter ? "text-primary" : "text-text-muted"}`}
            aria-label="Lọc tìm kiếm nâng cao"
            title="Lọc tìm kiếm nâng cao"
          >
            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {filterPopupOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              aria-hidden
              onClick={() => setFilterPopupOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="filter-dialog-title"
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border-default bg-bg-surface p-4 shadow-lg"
            >
              <h2 id="filter-dialog-title" className="mb-4 text-lg font-semibold text-text-primary">
                Lọc tìm kiếm nâng cao
              </h2>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-text-secondary">Phân loại lớp</span>
                  <select
                    value={filterDraft.type}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, type: (e.target.value || "") as "" | ClassType }))}
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {CLASS_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-text-secondary">Giáo viên</span>
                  <input
                    type="text"
                    value={filterDraft.teacher}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, teacher: e.target.value }))}
                    placeholder="Nhập tên giáo viên"
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={clearFilter}
                  className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Xóa
                </button>
                <button
                  type="button"
                  onClick={applyFilter}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </>
        )}

        <div className="min-w-0 flex-1 overflow-auto">
          {isLoading ? (
            <ClassesListTableSkeleton rows={5} />
          ) : isError ? (
            <div className="py-16 text-center text-error" role="alert" aria-live="assertive">
              <p className="text-sm">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  (error as Error)?.message ??
                  "Không tải được danh sách lớp."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted" aria-live="polite">
              <p className="text-sm">
                {search || hasActiveFilter
                  ? "Không có kết quả phù hợp bộ lọc."
                  : "Chưa có lớp nào."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách lớp học</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary">
                      <th scope="col" className="w-8 px-2 py-3" aria-label="Trạng thái" />
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Lớp</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Gia sư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary"
                      >
                        <td className="px-2 py-3 align-middle">
                          <span
                            className={`inline-block size-2 shrink-0 rounded-full ${statusDotColor(row.status)}`}
                            title={STATUS_LABELS[row.status]}
                            aria-hidden
                          />
                        </td>
                        <td className="min-w-0 px-4 py-3 text-text-primary">
                          <span className="truncate">{row.name?.trim() || "—"}</span>
                        </td>
                        <td className="min-w-0 px-4 py-3 text-text-secondary">
                          <span className="truncate">{tutorNames(row)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4"
                  aria-label="Phân trang"
                >
                  <p className="text-sm text-text-muted" aria-live="polite">
                    Hiển thị {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, total)} trong {total} lớp
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={page <= 1}
                      aria-label="Trang trước"
                      onClick={handlePreviousPage}
                    >
                      Trước
                    </button>
                    <span className="tabular-nums text-sm text-text-secondary">
                      Trang {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={page >= totalPages}
                      aria-label="Trang sau"
                      onClick={handleNextPage}
                    >
                      Sau
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
