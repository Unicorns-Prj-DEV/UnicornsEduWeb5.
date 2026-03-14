"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as costApi from "@/lib/apis/cost.api";
import { CostFormPopup, CostListTableSkeleton } from "@/components/admin/cost";
import type { CostFormSubmitPayload } from "@/components/admin/cost/CostFormPopup";
import { CostListItem, CostListResponse, CostStatus, CostUpsertMode } from "@/dtos/cost.dto";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 1000;

function normalizePage(rawPage: string | null): number {
  const parsed = Number(rawPage);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const STATUS_LABELS: Record<CostStatus, string> = {
  paid: "Đã thanh toán",
  pending: "Chờ thanh toán",
};

export default function AdminCostsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = normalizePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMode, setPopupMode] = useState<CostUpsertMode>("create");
  const [selectedCost, setSelectedCost] = useState<CostListItem | null>(null);

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
    data: costListResponse,
    isLoading,
    isError,
    error,
  } = useQuery<CostListResponse>({
    queryKey: ["cost", "list", page, PAGE_SIZE, search],
    queryFn: () =>
      costApi.getCosts({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
      }),
  });

  const list: CostListItem[] = costListResponse?.data ?? [];
  const total = costListResponse?.meta?.total ?? 0;
  const serverPage = costListResponse?.meta?.page;
  const currentPage = serverPage && Number.isFinite(serverPage) ? serverPage : page;
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

  const getErrorMessage = (err: unknown, fallback: string) => {
    return (
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (err as Error)?.message ??
      fallback
    );
  };

  const createMutation = useMutation({
    mutationFn: costApi.createCost,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cost", "list"] });
      toast.success("Đã tạo khoản chi phí.");
      setPopupOpen(false);
      setSelectedCost(null);
      setPopupMode("create");
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể tạo khoản chi phí."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: costApi.updateCost,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cost", "list"] });
      toast.success("Đã cập nhật khoản chi phí.");
      setPopupOpen(false);
      setSelectedCost(null);
      setPopupMode("create");
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể cập nhật khoản chi phí."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => costApi.deleteCostById(id),
    onSuccess: () => {
      toast.success("Đã xóa khoản chi phí.");
      queryClient.invalidateQueries({ queryKey: ["cost", "list"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể xóa khoản chi phí."));
    },
  });

  const handleOpenCreatePopup = () => {
    setPopupMode("create");
    setSelectedCost(null);
    setPopupOpen(true);
  };

  const handleOpenEditPopup = (cost: CostListItem) => {
    setPopupMode("edit");
    setSelectedCost(cost);
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setPopupOpen(false);
    setSelectedCost(null);
    setPopupMode("create");
  };

  const handleSubmitCost = async (payload: CostFormSubmitPayload) => {
    if (popupMode === "create") {
      if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
        toast.error("Không thể tạo mã chi phí. Vui lòng thử lại.");
        return;
      }

      const id = crypto.randomUUID();
      if (!id) {
        toast.error("Không thể tạo mã chi phí. Vui lòng thử lại.");
        return;
      }

      try {
        await createMutation.mutateAsync({
          id,
          category: payload.category,
          month: payload.month,
          date: payload.date,
          status: payload.status,
          amount: payload.amount,
        });
      } catch {
        // toast lỗi đã xử lý trong onError
      }
      return;
    }

    const editingId = selectedCost?.id;
    if (!editingId) {
      toast.error("Không tìm thấy khoản chi phí để cập nhật.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingId,
        category: payload.category,
        month: payload.month ?? null,
        date: payload.date ?? null,
        status: payload.status,
        amount: payload.amount,
      });
    } catch {
      // toast lỗi đã xử lý trong onError
    }
  };

  const handleDelete = async (id: string, category: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khoản "${category}"?`)) return;
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
          <h1 className="text-xl font-semibold text-text-primary">Chi phí mở rộng</h1>
          <button
            type="button"
            className="rounded-md border border-border-default bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary hover:cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
            aria-label="Thêm chi phí"
            title="Thêm chi phí"
            onClick={handleOpenCreatePopup}
          >
            Thêm chi phí
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
            <span className="shrink-0 text-sm font-medium text-text-secondary sm:w-24">Tìm kiếm</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Theo danh mục…"
              className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              aria-label="Tìm theo danh mục"
            />
          </label>
        </div>

        <div className="min-w-0 flex-1 overflow-auto">
          {isLoading ? (
            <CostListTableSkeleton rows={6} />
          ) : isError ? (
            <div className="py-16 text-center text-error" role="alert" aria-live="assertive">
              <p className="text-sm">
                {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  (error as Error)?.message ??
                  "Không tải được danh sách chi phí."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted" aria-live="polite">
              <p className="text-sm">
                {search ? "Không có kết quả phù hợp." : "Chưa có khoản chi phí nào."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách chi phí mở rộng</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary">
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Danh mục</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Tháng</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Ngày</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Trạng thái</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Số tiền</th>
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
                        className="group cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-150 hover:bg-bg-secondary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        onClick={() => handleOpenEditPopup(row)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          handleOpenEditPopup(row);
                        }}
                      >
                        <td className="min-w-0 px-4 py-3 text-text-primary">
                          <span className="truncate">{row.category?.trim() || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{row.month?.trim() || "—"}</td>
                        <td className="px-4 py-3 text-text-secondary">{formatDate(row.date)}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {row.status ? (STATUS_LABELS[row.status] ?? row.status) : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-text-primary">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              className="rounded p-1.5 text-text-muted transition-colors duration-200 hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:opacity-50"
                              aria-label={`Xóa ${row.category || "khoản chi phí"}`}
                              title="Xóa"
                              disabled={deleteMutation.isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(row.id, row.category?.trim() || "khoản chi phí");
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
                    Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} trong {total} khoản
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

      <CostFormPopup
        open={popupOpen}
        mode={popupMode}
        onClose={handleClosePopup}
        initialData={popupMode === "edit" ? selectedCost : null}
        onSubmit={handleSubmitCost}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
