"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useQuery } from "@tanstack/react-query";
import * as classApi from "@/lib/apis/class.api";
import { AddClassPopup, ClassListTableSkeleton } from "@/components/admin/class";
import { ClassListResponse, ClassStatus, ClassType } from "@/dtos/class.dto";
import { normalizeClassType } from "@/lib/class.helpers";

const SEARCH_DEBOUNCE_MS = 1000;
const PAGE_SIZE = 20;

function normalizePage(rawPage: string | null): number {
  const parsed = Number(rawPage);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

const TYPE_OPTIONS: { value: "" | ClassType; label: string }[] = [
  { value: "", label: "Tất cả loại" },
  { value: "basic", label: "Basic" },
  { value: "vip", label: "VIP" },
  { value: "advance", label: "Advance" },
  { value: "hardcore", label: "Hardcore" },
];

const TYPE_LABELS: Record<ClassType, string> = {
  basic: "Basic",
  vip: "VIP",
  advance: "Advance",
  hardcore: "Hardcore",
};

function statusBadgeClass(status: ClassStatus): string {
  return status === "running"
    ? "bg-warning/15 text-warning ring-warning/25"
    : "bg-bg-secondary text-text-secondary ring-border-default";
}

type ClassRow = {
  id: string;
  name: string;
  type: ClassType;
  status: ClassStatus;
  teacherNames: string;
};

export default function AdminClassesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = normalizePage(searchParams.get("page"));
  const typeFilter = normalizeClassType(searchParams.get("type"));
  const search = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [addPopupOpen, setAddPopupOpen] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const applySearchToUrl = useDebouncedCallback(
    (value: string, currentParams: string, currentPathname: string) => {
      const params = new URLSearchParams(currentParams);
      params.set("search", value);
      params.set("page", "1");
      router.replace(`${currentPathname}?${params.toString()}`);
    },
    SEARCH_DEBOUNCE_MS,
  );

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    applySearchToUrl(value, searchParams?.toString() ?? "", pathname);
  };

  const handleFilterChange = (next: { type?: "" | ClassType }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.type !== undefined) {
      params.set("type", next.type);
      params.set("page", "1");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const selectedTypeLabel = useMemo(() => {
    return TYPE_OPTIONS.find((opt) => opt.value === typeFilter)?.label ?? "Tất cả loại";
  }, [typeFilter]);

  const {
    data: classListResponse,
    isLoading,
    isError,
    error,
  } = useQuery<ClassListResponse>({
    queryKey: ["class", "list", page, PAGE_SIZE, search, typeFilter],
    queryFn: () =>
      classApi.getClasses({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        type: typeFilter,
      }),
  });

  const list = useMemo<ClassRow[]>(() => {
    return (classListResponse?.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      status: item.status,
      teacherNames:
        item.teachers && item.teachers.length > 0
          ? item.teachers
            .map((teacher) => teacher.fullName?.trim() || teacher.id)
            .join(", ")
          : "—",
    }));
  }, [classListResponse]);

  const statusDotColor = (status: ClassStatus) =>
    status === "running" ? "bg-warning" : "bg-text-muted";
  const statusLabel = (status: ClassStatus) =>
    status === "running" ? "Đang chạy" : "Đã kết thúc";

  const total = classListResponse?.meta?.total ?? 0;
  const serverPage = classListResponse?.meta?.page;
  const currentPage =
    serverPage && Number.isFinite(serverPage) && serverPage > 0 ? Math.floor(serverPage) : page;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!serverPage || serverPage === page) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(serverPage));
    router.replace(`${pathname}?${params.toString()}`);
  }, [serverPage, page, searchParams, pathname, router]);

  const handlePreviousPage = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(Math.max(1, currentPage - 1)));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleNextPage = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(Math.min(totalPages, currentPage + 1)));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSelectType = (nextType: "" | ClassType) => {
    handleFilterChange({ type: nextType });
    setTypeMenuOpen(false);
  };

  useEffect(() => {
    if (!typeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!typeMenuRef.current?.contains(event.target as Node)) {
        setTypeMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTypeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [typeMenuOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <section className="relative mb-4 overflow-visible rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-10 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Lớp học</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Theo dõi trạng thái và điều phối danh sách lớp nhanh hơn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddPopupOpen(true)}
              className="w-full rounded-md border border-primary/25 bg-primary px-4 py-2 text-sm font-medium text-text-inverse shadow-sm transition-all duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface sm:w-auto"
              aria-label="Thêm lớp học"
              title="Thêm lớp học"
            >
              Thêm lớp học
            </button>
          </div>

          <div className="relative mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <label className="block min-w-0" htmlFor="class-search-input">
              <span className="text-sm font-medium text-text-secondary">Tìm kiếm</span>
              <div className="mt-1 flex items-center rounded-md border border-border-default bg-bg-surface/90 px-3 focus-within:border-border-focus focus-within:ring-2 focus-within:ring-border-focus">
                <svg className="size-4 shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
                <input
                  id="class-search-input"
                  type="search"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Theo tên lớp…"
                  className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
                  aria-label="Tìm theo tên lớp"
                />
              </div>
            </label>

            <div className="block" ref={typeMenuRef}>
              <span className="text-sm font-medium text-text-secondary">Loại lớp</span>
              <button
                type="button"
                className="mt-1 flex w-full items-center justify-between rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                onClick={() => setTypeMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={typeMenuOpen}
                aria-label="Lọc theo loại lớp"
              >
                <span className="truncate">{selectedTypeLabel}</span>
                <svg
                  className={`ml-2 size-4 shrink-0 text-text-muted transition-transform duration-200 ${typeMenuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {typeMenuOpen && (
                <div className="relative">
                  <div
                    role="listbox"
                    aria-label="Danh sách loại lớp"
                    className=" absolute z-999 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border-default bg-bg-surface p-1 shadow-lg"
                  >
                    {TYPE_OPTIONS.map((opt) => {
                      const isActive = opt.value === typeFilter;
                      return (
                        <button
                          key={opt.value || "all"}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm transition-colors duration-150 ${isActive
                            ? "bg-primary/10 font-medium text-text-primary"
                            : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                            }`}
                          onClick={() => handleSelectType(opt.value)}
                        >
                          <span>{opt.label}</span>
                          {isActive ? (
                            <svg className="size-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 12 5 5L20 7" />
                            </svg>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="min-w-0 flex-1 overflow-auto">
          {isLoading ? (
            <ClassListTableSkeleton rows={6} />
          ) : isError ? (
            <div className="py-16 text-center text-error" role="alert" aria-live="assertive">
              <p className="text-sm">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  (error as Error)?.message ??
                  "Không tải được danh sách lớp học."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted" aria-live="polite">
              <p className="text-sm">
                {search || typeFilter
                  ? "Không có kết quả phù hợp bộ lọc."
                  : "Chưa có lớp học nào."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {list.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="w-full rounded-xl border border-border-default bg-bg-surface p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    onClick={() => router.push(`/admin/classes/${row.id}`)}
                    aria-label={`Xem chi tiết lớp ${row.name?.trim() || ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-semibold text-text-primary">
                        {row.name?.trim() || "—"}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs ring-1 ${statusBadgeClass(row.status)}`}
                      >
                        <span className={`inline-block size-2 rounded-full ${statusDotColor(row.status)}`} aria-hidden />
                        {statusLabel(row.status)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-[56px_1fr] gap-x-2 gap-y-1 text-xs">
                      <span className="text-text-muted">Loại</span>
                      <span className="text-text-secondary">{TYPE_LABELS[row.type] ?? row.type}</span>
                      <span className="text-text-muted">Gia sư</span>
                      <span className="line-clamp-2 text-text-secondary">{row.teacherNames || "—"}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách lớp học</caption>
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
                        Gia sư
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => (
                      <tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary/80 focus-within:bg-bg-secondary/80"
                        onClick={() => router.push(`/admin/classes/${row.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/admin/classes/${row.id}`);
                          }
                        }}
                        aria-label={`Xem chi tiết lớp ${row.name?.trim() || ""}`}
                      >
                        <td className="px-2 py-3 align-middle">
                          <span
                            className={`inline-block size-2 shrink-0 rounded-full ${statusDotColor(row.status)}`}
                            title={statusLabel(row.status)}
                            aria-hidden
                          />
                        </td>
                        <td className="min-w-0 px-4 py-3 text-text-primary">
                          <span className="truncate">{row.name?.trim() || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          <span className="inline-flex rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-medium text-text-secondary ring-1 ring-border-default">
                            {TYPE_LABELS[row.type] ?? row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {row.teacherNames || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-4 flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  aria-label="Phân trang"
                >
                  <p className="text-sm text-text-muted" aria-live="polite">
                    Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, total)} trong {total} lớp học
                  </p>
                  <div className="grid grid-cols-3 items-center gap-2 sm:flex sm:items-center">
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage <= 1}
                      aria-label="Trang trước"
                      onClick={handlePreviousPage}
                    >
                      Trước
                    </button>
                    <span className="text-center tabular-nums text-sm text-text-secondary">
                      {currentPage}/{totalPages}
                    </span>
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage >= totalPages}
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

      <AddClassPopup
        open={addPopupOpen}
        onClose={() => setAddPopupOpen(false)}
      />
    </div>
  );
}
