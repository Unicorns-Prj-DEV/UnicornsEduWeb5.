"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { AddClassPopup } from "@/components/admin/class";
import { ClassStatus, ClassType } from "@/dtos/class.dto";
import { normalizeClassType } from "@/lib/class.helpers";

const SEARCH_DEBOUNCE_MS = 1000;

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

/** Mock data – trang lớp học chỉ hiển thị Tên lớp, Loại lớp, Gia sư; dấu chấm trạng thái giữ nguyên */
interface MockClassRow {
  id: string;
  name: string;
  type: ClassType;
  status: ClassStatus;
  teacherNames: string;
}

const INITIAL_MOCK_CLASSES: MockClassRow[] = [
  { id: "c1", name: "Lớp Toán 10A", type: "basic", status: "running", teacherNames: "Nguyễn Văn A" },
  { id: "c2", name: "Lớp Lý 11B", type: "vip", status: "running", teacherNames: "Trần Thị B, Lê Văn C" },
  { id: "c3", name: "Lớp Hóa 12", type: "advance", status: "ended", teacherNames: "Phạm Thị D" },
  { id: "c4", name: "Lớp Anh 9", type: "basic", status: "running", teacherNames: "—" },
];


export default function AdminClassesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const typeFilter = normalizeClassType(searchParams.get("type"));
  const search = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [addPopupOpen, setAddPopupOpen] = useState(false);
  const [classes, setClasses] = useState<MockClassRow[]>(() => INITIAL_MOCK_CLASSES);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const applySearchToUrl = useDebouncedCallback(
    (value: string, currentParams: string, currentPathname: string) => {
      const params = new URLSearchParams(currentParams);
      params.set("search", value);
      router.replace(`${currentPathname}?${params.toString()}`);
    },
    SEARCH_DEBOUNCE_MS,
  );

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    applySearchToUrl(value, searchParams?.toString() ?? "", pathname);
  };

  const list = useMemo(() => {
    let filtered = classes;
    const searchLower = search.trim().toLowerCase();
    if (searchLower) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.teacherNames.toLowerCase().includes(searchLower),
      );
    }
    if (typeFilter) {
      filtered = filtered.filter((c) => c.type === typeFilter);
    }
    return filtered;
  }, [classes, search, typeFilter]);

  const handleAddClass = (data: { name: string; type: ClassType; status: ClassStatus; teacherNames: string }) => {
    const id = `c${Date.now()}`;
    setClasses((prev) => [...prev, { ...data, id }]);
  };

  const handleFilterChange = (next: { type?: "" | ClassType }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.type !== undefined) {
      params.set("type", next.type);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const statusDotColor = (status: ClassStatus) =>
    status === "running" ? "bg-warning" : "bg-text-muted";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Lớp học</h1>
          <button
            type="button"
            onClick={() => setAddPopupOpen(true)}
            className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
            aria-label="Thêm lớp học"
            title="Thêm lớp học"
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
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted" aria-live="polite">
              <p className="text-sm">
                {search || typeFilter
                  ? "Không có kết quả phù hợp bộ lọc."
                  : "Chưa có lớp học nào."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] border-collapse text-left text-sm">
                <caption className="sr-only">Danh sách lớp học</caption>
                <thead>
                  <tr className="border-b border-border-default bg-bg-secondary">
                    <th scope="col" className="w-8 px-2 py-3" aria-label="Trạng thái" />
                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                      Tên lớp
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                      Loại lớp
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
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
                      className="cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary focus-within:bg-bg-secondary"
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
                          title={row.status === "running" ? "Đang chạy" : "Đã kết thúc"}
                          aria-hidden
                        />
                      </td>
                      <td className="min-w-0 px-4 py-3 text-text-primary">
                        <span className="truncate">{row.name?.trim() || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {TYPE_LABELS[row.type] ?? row.type}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {row.teacherNames || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-text-muted">Dữ liệu mẫu. Sẽ kết nối API sau.</p>
        </div>
      </div>

      <AddClassPopup
        open={addPopupOpen}
        onClose={() => setAddPopupOpen(false)}
        onAdd={handleAddClass}
      />
    </div>
  );
}
