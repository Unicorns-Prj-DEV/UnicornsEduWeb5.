"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import * as staffApi from "@/lib/apis/staff.api";

type DropdownRect = { top: number; left: number; width: number };

type Props = {
  open: boolean;
  onClose: () => void;
  classDetail: ClassDetail;
};

function getDropdownRect(el: HTMLElement | null): DropdownRect | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.bottom + 4, left: rect.left, width: rect.width };
}

export default function EditClassTeachersPopup({ open, onClose, classDetail }: Props) {
  const queryClient = useQueryClient();
  const teacherSearchRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const [selectedTeachers, setSelectedTeachers] = useState<
    Array<{ id: string; name: string; customAllowance?: number }>
  >(() =>
    (classDetail.teachers ?? [])
      .filter((t) => t?.id)
      .map((t) => ({
        id: t.id,
        name: t.fullName?.trim() ?? "—",
        customAllowance: t.customAllowance ?? undefined,
      })),
  );
  const [teacherSearchInput, setTeacherSearchInput] = useState("");
  const [teacherSearchFocused, setTeacherSearchFocused] = useState(false);
  const [debouncedTeacherSearch] = useDebounce(teacherSearchInput.trim(), 350);

  const { data: staffSearchResult } = useQuery({
    queryKey: ["staff", "list", { page: 1, limit: 50, search: debouncedTeacherSearch }],
    queryFn: () =>
      staffApi.getStaff({
        page: 1,
        limit: 50,
        search: debouncedTeacherSearch || undefined,
      }),
    enabled: open,
  });

  useLayoutEffect(() => {
    if (!teacherSearchFocused) {
      setDropdownRect(null);
      return;
    }
    const updateRect = () => setDropdownRect(getDropdownRect(teacherSearchRef.current));
    updateRect();
    const scrollable = scrollableRef.current;
    scrollable?.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      scrollable?.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [teacherSearchFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inInput = teacherSearchRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inInput && !inDropdown) {
        setTeacherSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedTeachers(
      (classDetail.teachers ?? [])
        .filter((t) => t?.id)
        .map((t) => ({
          id: t.id,
          name: t.fullName?.trim() ?? "—",
          customAllowance: t.customAllowance ?? undefined,
        })),
    );
    setTeacherSearchInput("");
  }, [open, classDetail]);

  const updateMutation = useMutation({
    mutationFn: (data: { teachers: { teacher_id: string; custom_allowance?: number }[] }) =>
      classApi.updateClassTeachers(classDetail.id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["class", "detail", classDetail.id] }),
        queryClient.invalidateQueries({ queryKey: ["class", "list"] }),
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật danh sách gia sư.";
      toast.error(msg);
    },
  });

  const handleSubmit = async () => {
    const teachers = selectedTeachers.map((t) => ({
      teacher_id: t.id,
      ...(t.customAllowance != null ? { custom_allowance: t.customAllowance } : {}),
    }));
    try {
      await updateMutation.mutateAsync({ teachers });
      toast.success("Đã lưu danh sách gia sư.");
      onClose();
    } catch {
      // handled in onError
    }
  };

  if (!open) return null;

  const staffList = staffSearchResult?.data ?? [];
  const availableStaff = staffList.filter((s) => !selectedTeachers.some((t) => t.id === s.id));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-teachers-title"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id="edit-class-teachers-title" className="text-lg font-semibold text-text-primary">
            Chỉnh sửa gia sư phụ trách
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={scrollableRef} className="flex-1 space-y-4 overflow-y-auto p-2">
          <p className="text-xs text-text-muted">
            Có thể nhập trợ cấp riêng (VNĐ) cho từng gia sư; để trống thì dùng trợ cấp mặc định của lớp.
          </p>
          <div className="space-y-3">
            {selectedTeachers.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-bg-surface p-2 sm:flex-nowrap"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                  {t.name}
                </span>
                <label className="flex shrink-0 items-center gap-1.5 text-sm text-text-secondary">
                  <span className="whitespace-nowrap text-xs">Trợ cấp riêng</span>
                  <input
                    type="number"
                    min={0}
                    value={t.customAllowance ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (v === "") {
                        setSelectedTeachers((prev) =>
                          prev.map((x) =>
                            x.id === t.id ? { ...x, customAllowance: undefined } : x,
                          ),
                        );
                        return;
                      }
                      const num = Number(v);
                      if (!Number.isFinite(num) || num < 0) {
                        toast.error("Trợ cấp riêng phải là số không âm.");
                        return;
                      }
                      setSelectedTeachers((prev) =>
                        prev.map((x) =>
                          x.id === t.id ? { ...x, customAllowance: Math.floor(num) } : x,
                        ),
                      );
                    }}
                    placeholder="VNĐ"
                    className="w-24 rounded outline outline-1 outline-border-default outline-offset-0 bg-bg-primary px-2 py-1.5 text-right text-sm tabular-nums text-text-primary focus:outline-2 focus:outline-border-focus focus:outline-offset-0"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedTeachers((prev) => prev.filter((x) => x.id !== t.id))}
                  className="rounded p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label={`Bỏ ${t.name}`}
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="relative" ref={teacherSearchRef}>
            <input
              type="text"
              value={teacherSearchInput}
              onChange={(e) => setTeacherSearchInput(e.target.value)}
              onFocus={() => setTeacherSearchFocused(true)}
              placeholder="Tìm kiếm gia sư theo tên..."
              className="w-full rounded-md outline outline-1 outline-border-default outline-offset-0 bg-bg-surface px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-border-focus focus:outline-offset-0"
              aria-label="Tìm kiếm gia sư"
              aria-autocomplete="list"
              aria-expanded={teacherSearchFocused}
            />
            {teacherSearchFocused &&
              dropdownRect &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={dropdownRef}
                  role="listbox"
                  className="z-[60] max-h-48 overflow-y-auto rounded-md border border-border-default bg-bg-surface py-1 shadow-lg"
                  style={{
                    position: "fixed",
                    top: dropdownRect.top,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                    minWidth: 200,
                  }}
                >
                  {availableStaff.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-text-muted">
                      {teacherSearchInput.trim()
                        ? "Không tìm thấy kết quả"
                        : "Nhập tên để tìm kiếm gia sư"}
                    </p>
                  ) : (
                    availableStaff.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        onClick={() => {
                          setSelectedTeachers((prev) => [
                            ...prev,
                            { id: s.id, name: s.fullName?.trim() ?? s.id, customAllowance: undefined },
                          ]);
                          setTeacherSearchInput("");
                          setTeacherSearchFocused(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-tertiary focus:bg-bg-tertiary focus:outline-none focus-visible:ring-0"
                      >
                        {s.fullName?.trim() || s.id}
                      </button>
                    ))
                  )}
                </div>,
                document.body,
              )}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-end gap-2 border-t border-border-default pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
          >
            {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </>
  );
}
