"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as staffApi from "@/lib/apis/staff.api";
import { StaffListTableSkeleton } from "@/components/admin/staff";
import { StaffListResponse, StaffListItem, StaffStatus } from "@/dtos/staff.dto";

const PAGE_SIZE = 20;

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

const SEARCH_DEBOUNCE_MS = 1000;

export default function AdminStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const filterProvince = searchParams.get("province") ?? "";
  const filterUniversity = searchParams.get("university") ?? "";
  const filterHighSchool = searchParams.get("thpt") ?? ""; // URL param "thpt" for THPT

  const [searchInput, setSearchInput] = useState(search);
  const [filterPopupOpen, setFilterPopupOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState({ province: "", university: "", thpt: "" });

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const applySearchToUrl = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("search", value);
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }, SEARCH_DEBOUNCE_MS);

  const openFilterPopup = () => {
    setFilterDraft({
      province: filterProvince,
      university: filterUniversity,
      thpt: filterHighSchool,
    });
    setFilterPopupOpen(true);
  };

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", "1");
    if (filterDraft.province.trim()) params.set("province", filterDraft.province.trim());
    else params.delete("province");
    if (filterDraft.university.trim()) params.set("university", filterDraft.university.trim());
    else params.delete("university");
    if (filterDraft.thpt.trim()) params.set("thpt", filterDraft.thpt.trim());
    else params.delete("thpt");
    router.replace(`${pathname}?${params.toString()}`);
    setFilterPopupOpen(false);
  };

  const clearFilter = () => {
    setFilterDraft({ province: "", university: "", thpt: "" });
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("province");
    params.delete("university");
    params.delete("thpt");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
    setFilterPopupOpen(false);
  };

  const hasActiveFilter = !!(filterProvince || filterUniversity || filterHighSchool);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    applySearchToUrl(value);
  };

  const {
    data: staffListResponse,
    isLoading,
    isError,
    error,
  } = useQuery<staffApi.StaffListResponse>({
    queryKey: ["staff", "list", page, PAGE_SIZE, search, filterProvince, filterUniversity, filterHighSchool],
    queryFn: () =>
      staffApi.getStaff({
        page: page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        province: filterProvince.trim() || undefined,
        university: filterUniversity.trim() || undefined,
        highSchool: filterHighSchool.trim() || undefined,
      }),
  });

  const list: StaffListItem[] = staffListResponse?.data ?? [];
  const total = staffListResponse?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildListParams = () => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (search) params.set("search", search);
    if (filterProvince) params.set("province", filterProvince);
    if (filterUniversity) params.set("university", filterUniversity);
    if (filterHighSchool) params.set("thpt", filterHighSchool);
    return params;
  };

  const handlePreviousPage = () => {
    const params = buildListParams();
    params.set("page", (page - 1).toString());
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleNextPage = () => {
    const params = buildListParams();
    params.set("page", (page + 1).toString());
    router.replace(`${pathname}?${params.toString()}`);
  }

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => staffApi.deleteStaffById(id),
    onSuccess: () => {
      toast.success("Đã xóa nhân sự.");
      queryClient.invalidateQueries({ queryKey: ["staff", "list"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể xóa.";
      toast.error(msg);
    },
  });

  const statusDotColor = (status: StaffStatus) =>
    status === "active" ? "bg-warning" : "bg-text-muted";

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân sự "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
    } catch {
      // toast lỗi đã xử lý trong onError
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-text-primary">Nhân sự</h1>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
            <span className="shrink-0 text-sm font-medium text-text-secondary sm:w-24">Tìm kiếm</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Theo tên…"
              className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              aria-label="Tìm theo tên"
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
                  <span className="mb-1 block text-sm font-medium text-text-secondary">Tỉnh, thành phố</span>
                  <input
                    type="text"
                    value={filterDraft.province}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, province: e.target.value }))}
                    placeholder="Nhập tỉnh/thành phố"
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-text-secondary">Đại học</span>
                  <input
                    type="text"
                    value={filterDraft.university}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, university: e.target.value }))}
                    placeholder="Nhập đại học"
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-text-secondary">THPT</span>
                  <input
                    type="text"
                    value={filterDraft.thpt}
                    onChange={(e) => setFilterDraft((d) => ({ ...d, thpt: e.target.value }))}
                    placeholder="Nhập THPT"
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
            <StaffListTableSkeleton rows={5} />
          ) : isError ? (
            <div className="py-16 text-center text-error" role="alert" aria-live="assertive">
              <p className="text-sm">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  (error as Error)?.message ??
                  "Không tải được danh sách nhân sự."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted" aria-live="polite">
              <p className="text-sm">
                {search || filterProvince || filterUniversity || filterHighSchool
                  ? "Không có kết quả phù hợp bộ lọc."
                  : "Chưa có nhân sự nào."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách nhân sự (staff_info)</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary">
                      <th scope="col" className="w-8 px-2 py-3" aria-label="Trạng thái" />
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Tên</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Tỉnh</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Lớp</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Chưa thanh toán</th>
                      <th scope="col" className="w-24 px-4 py-3">
                        <span className="sr-only">Xóa</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => {
                      const unpaid = row.monthlyStats?.[0]?.totalUnpaidAll;
                      const classes =
                        row.classTeachers?.map((ct) => ct.class.name).filter(Boolean).join(", ") || "—";
                      const province = row.user?.province?.trim() || "—";
                      return (
                        <tr
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          className="group cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary focus-within:bg-bg-secondary"
                          onClick={() => router.push(`/admin/staffs/${row.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(`/admin/staffs/${row.id}`);
                            }
                          }}
                          aria-label={`Xem chi tiết ${row.fullName?.trim() || "nhân sự"}`}
                        >
                          <td className="px-2 py-3 align-middle">
                            <span
                              className={`inline-block size-2 shrink-0 rounded-full ${statusDotColor(row.status)}`}
                              title={row.status === "active" ? "Hoạt động" : "Ngừng"}
                              aria-hidden
                            />
                          </td>
                          <td className="min-w-0 px-4 py-3 text-text-primary">
                            <span className="truncate">{row.fullName?.trim() || "—"}</span>
                          </td>
                          <td className="min-w-0 px-4 py-3 text-text-secondary">
                            <span className="truncate">{province}</span>
                          </td>
                          <td className="min-w-0 px-4 py-3 text-text-secondary">
                            <span className="truncate">{classes}</span>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-text-primary">
                            {formatCurrency(unpaid ?? undefined)}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                              <button
                                type="button"
                                className="rounded p-1.5 text-text-muted transition-colors duration-200 hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:opacity-50"
                                aria-label={`Xóa ${row.fullName}`}
                                title="Xóa"
                                disabled={deleteMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(row.id, row.fullName?.trim() || "");
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
                      );
                    })}
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
                    {Math.min(page * PAGE_SIZE, total)} trong {total} nhân sự
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
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
