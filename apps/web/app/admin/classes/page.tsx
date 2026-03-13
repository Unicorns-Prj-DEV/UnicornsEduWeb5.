"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import {
  formatCurrency,
  normalizeClassStatus,
  normalizeClassType,
  normalizePage,
} from "@/lib/class.helpers";
import { ClassListTableSkeleton } from "@/components/admin/class";
import { ClassStatus, ClassType, ClassListItem, ClassListResponse } from "@/dtos/class.dto";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 1000;

const STATUS_OPTIONS: { value: "" | ClassStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "running", label: "Đang chạy" },
  { value: "ended", label: "Đã kết thúc" },
];

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

const STATUS_LABELS: Record<ClassStatus, string> = {
  running: "Đang chạy",
  ended: "Đã kết thúc",
};


export default function AdminClassesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = normalizePage(searchParams.get("page"));
  const statusFilter = normalizeClassStatus(searchParams.get("status"));
  const typeFilter = normalizeClassType(searchParams.get("type"));
  const search = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(search);

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

  const {
    data: classListResponse,
    isLoading,
    isError,
    error,
  } = useQuery<ClassListResponse>({
    queryKey: ["class", "list", page, PAGE_SIZE, search, statusFilter, typeFilter],
    queryFn: () =>
      classApi.getClasses({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      }),
  });

  const list: ClassListItem[] = classListResponse?.data ?? [];
  const total = classListResponse?.meta?.total ?? 0;
  const serverPage = classListResponse?.meta?.page;
  const currentPage = serverPage && Number.isFinite(serverPage) ? serverPage : page;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!serverPage || serverPage === page) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(serverPage));
    router.replace(`${pathname}?${params.toString()}`);
  }, [serverPage, page, searchParams, pathname, router]);

  const handleFilterChange = (next: { status?: "" | ClassStatus; type?: "" | ClassType }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.status !== undefined) {
      params.set("status", next.status);
    }
    if (next.type !== undefined) {
      params.set("type", next.type);
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  };

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

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => classApi.deleteClassById(id),
    onSuccess: () => {
      toast.success("Đã xóa lớp học.");
      queryClient.invalidateQueries({ queryKey: ["class", "list"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể xóa lớp học.";
      toast.error(msg);
    },
  });

  const statusDotColor = (status: ClassStatus) =>
    status === "running" ? "bg-warning" : "bg-text-muted";

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa lớp "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
    } catch {
      // toast lỗi đã xử lý trong onError
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Lớp học</h1>
          <button
            type="button"
            className="rounded-md border border-border-default bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:opacity-50"
            disabled
            aria-label="Thêm lớp học (sắp ra mắt)"
            title="Thêm lớp học (sắp ra mắt)"
          >
            Thêm lớp học
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
              <span className="shrink-0 text-sm font-medium text-text-secondary sm:w-24">Trạng thái</span>
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange({ status: (e.target.value || "") as "" | ClassStatus })}
                className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                aria-label="Lọc theo trạng thái"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
              <span className="shrink-0 text-sm font-medium text-text-secondary sm:w-16">Loại</span>
              <select
                value={typeFilter}
                onChange={(e) => handleFilterChange({ type: (e.target.value || "") as "" | ClassType })}
                className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                aria-label="Lọc theo loại lớp"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

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
                {search || statusFilter || typeFilter
                  ? "Không có kết quả phù hợp bộ lọc."
                  : "Chưa có lớp học nào."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách lớp học</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary">
                      <th scope="col" className="w-8 px-2 py-3" aria-label="Trạng thái" />
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Tên lớp</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Loại</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Trạng thái</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Sĩ số tối đa</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Học phí/buổi</th>
                      <th scope="col" className="w-24 px-4 py-3">
                        <span className="sr-only">Xóa</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => (
                      <tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className="group cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary focus-within:bg-bg-secondary"
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
                            title={STATUS_LABELS[row.status]}
                            aria-hidden
                          />
                        </td>
                        <td className="min-w-0 px-4 py-3 text-text-primary">
                          <span className="truncate">{row.name?.trim() || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{TYPE_LABELS[row.type] ?? row.type}</td>
                        <td className="px-4 py-3 text-text-secondary">{STATUS_LABELS[row.status] ?? row.status}</td>
                        <td className="px-4 py-3 tabular-nums text-text-primary">{row.maxStudents ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums text-text-primary">
                          {formatCurrency(row.studentTuitionPerSession)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              className="rounded p-1.5 text-text-muted transition-colors duration-200 hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:opacity-50"
                              aria-label={`Xóa ${row.name}`}
                              title="Xóa"
                              disabled={deleteMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(row.id, row.name?.trim() || "");
                              }}
                            >
                              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
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
                    Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} trong {total} lớp
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage <= 1}
                      aria-label="Trang trước"
                      onClick={handlePreviousPage}
                    >
                      Trước
                    </button>
                    <span className="tabular-nums text-sm text-text-secondary">
                      Trang {currentPage} / {totalPages}
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
    </div>
  );
}
