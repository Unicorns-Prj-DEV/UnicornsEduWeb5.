"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import * as staffApi from "@/lib/apis/staff.api";
import {
  classEditorModalClassName,
  classEditorModalCloseButtonClassName,
  classEditorModalFooterClassName,
  classEditorModalHeaderClassName,
  classEditorModalInsetBodyClassName,
  classEditorModalPrimaryButtonClassName,
  classEditorModalSecondaryButtonClassName,
  classEditorModalTitleClassName,
} from "./classEditorModalStyles";

type DropdownRect = { top: number; left: number; width: number; maxHeight: number };

type Props = {
  open: boolean;
  onClose: () => void;
  classDetail: ClassDetail;
};

function getDropdownRect(el: HTMLElement | null): DropdownRect | null {
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const viewportPadding = 8;
  const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
  const left = Math.min(
    Math.max(rect.left, viewportPadding),
    window.innerWidth - viewportPadding - width,
  );
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const shouldOpenUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
  const availableHeight = shouldOpenUpward ? spaceAbove - 4 : spaceBelow - 4;
  const maxHeight = Math.max(0, Math.min(240, availableHeight));
  const top = shouldOpenUpward
    ? Math.max(viewportPadding, rect.top - maxHeight - 4)
    : rect.bottom + 4;

  return { top, left, width, maxHeight };
}

export default function EditClassTeachersPopup({ open, onClose, classDetail }: Props) {
  if (!open) return null;

  return <EditClassTeachersDialog onClose={onClose} classDetail={classDetail} />;
}

function EditClassTeachersDialog({ onClose, classDetail }: Omit<Props, "open">) {
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
  });

  useLayoutEffect(() => {
    if (!teacherSearchFocused) return;
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
        setDropdownRect(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const staffList = staffSearchResult?.data ?? [];
  const availableStaff = staffList.filter((s) => !selectedTeachers.some((t) => t.id === s.id));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-teachers-title"
        className={classEditorModalClassName}
      >
        <div className={classEditorModalHeaderClassName}>
          <h2 id="edit-class-teachers-title" className={classEditorModalTitleClassName}>
            Chỉnh sửa gia sư phụ trách
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={classEditorModalCloseButtonClassName}
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={scrollableRef} className={classEditorModalInsetBodyClassName}>
          <p className="text-xs text-text-muted">
            Có thể nhập trợ cấp riêng (VNĐ) cho từng gia sư; để trống thì dùng trợ cấp mặc định của lớp.
          </p>
          <div className="space-y-3">
            {selectedTeachers.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-border-default bg-bg-surface p-3 shadow-sm"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(8.5rem,10rem)_auto] items-start gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                      Gia sư phụ trách
                    </p>
                    <p className="truncate text-lg font-semibold text-text-primary">{t.name}</p>
                  </div>
                  <label className="min-w-0">
                    <span className="sr-only">Trợ cấp riêng cho {t.name}</span>
                    <p className="ml-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                      Trợ cấp
                    </p>
                    <div className="rounded-xl border border-border-default bg-bg-primary px-3 py-2">
                      <div className="flex items-center gap-1.5">
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
                          placeholder={String(classDetail.allowancePerSessionPerStudent ?? "")}
                          className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold tabular-nums text-text-primary outline-none placeholder:text-text-muted"
                        />
                        <span className="shrink-0 text-xs font-medium text-text-muted">VNĐ</span>
                      </div>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedTeachers((prev) => prev.filter((x) => x.id !== t.id))}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label={`Bỏ ${t.name}`}
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-muted text-right">
                  Để trống để dùng trợ cấp mặc định của lớp.
                </p>
              </div>
            ))}
          </div>
          <div className="relative" ref={teacherSearchRef}>
            <input
              type="text"
              value={teacherSearchInput}
              onChange={(e) => setTeacherSearchInput(e.target.value)}
              onFocus={() => {
                setTeacherSearchFocused(true);
                setDropdownRect(getDropdownRect(teacherSearchRef.current));
              }}
              placeholder="Tìm kiếm gia sư theo tên..."
              className="w-full rounded-md outline outline-1 outline-border-default outline-offset-0 bg-bg-surface px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-border-focus focus:outline-offset-0"
              aria-label="Tìm kiếm gia sư"
              aria-autocomplete="list"
            />
            {teacherSearchFocused &&
              dropdownRect &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={dropdownRef}
                  role="listbox"
                  className="z-[60] overflow-y-auto rounded-md border border-border-default bg-bg-surface py-1 shadow-lg"
                  style={{
                    position: "fixed",
                    top: dropdownRect.top,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                    maxHeight: dropdownRect.maxHeight,
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
                        aria-selected={false}
                        onClick={() => {
                          setSelectedTeachers((prev) => [
                            ...prev,
                            { id: s.id, name: s.fullName?.trim() ?? s.id, customAllowance: undefined },
                          ]);
                          setTeacherSearchInput("");
                          setTeacherSearchFocused(false);
                          setDropdownRect(null);
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

        <div className={classEditorModalFooterClassName}>
          <button
            type="button"
            onClick={onClose}
            className={classEditorModalSecondaryButtonClassName}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className={classEditorModalPrimaryButtonClassName}
          >
            {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </>
  );
}
