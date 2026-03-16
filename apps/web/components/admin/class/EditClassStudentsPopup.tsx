"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import * as studentApi from "@/lib/apis/student.api";

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

export default function EditClassStudentsPopup({ open, onClose, classDetail }: Props) {
  const queryClient = useQueryClient();
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const [selectedStudents, setSelectedStudents] = useState<Array<{ id: string; name: string }>>(() =>
    (classDetail.students ?? []).map((s) => ({ id: s.id, name: s.fullName?.trim() ?? "—" })),
  );
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [studentSearchFocused, setStudentSearchFocused] = useState(false);
  const [debouncedStudentSearch] = useDebounce(studentSearchInput.trim(), 350);

  const { data: studentSearchResult } = useQuery({
    queryKey: ["student", "list", { page: 1, limit: 50, search: debouncedStudentSearch }],
    queryFn: () =>
      studentApi.getStudents({
        page: 1,
        limit: 50,
        search: debouncedStudentSearch || undefined,
      }),
    enabled: open,
  });

  const filteredStudents = (studentSearchResult ?? []).filter(
    (s) => !selectedStudents.some((st) => st.id === s.id),
  );

  useLayoutEffect(() => {
    if (!studentSearchFocused) {
      setDropdownRect(null);
      return;
    }
    const updateRect = () => setDropdownRect(getDropdownRect(studentSearchRef.current));
    updateRect();
    const scrollable = scrollableRef.current;
    scrollable?.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      scrollable?.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [studentSearchFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inInput = studentSearchRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inInput && !inDropdown) {
        setStudentSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedStudents(
      (classDetail.students ?? []).map((s) => ({ id: s.id, name: s.fullName?.trim() ?? "—" })),
    );
    setStudentSearchInput("");
  }, [open, classDetail]);

  const updateMutation = useMutation({
    mutationFn: (data: { student_ids: string[] }) =>
      classApi.updateClassStudents(classDetail.id, data),
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
        "Không thể cập nhật danh sách học sinh.";
      toast.error(msg);
    },
  });

  const handleSubmit = async () => {
    const student_ids = selectedStudents.map((s) => s.id);
    try {
      await updateMutation.mutateAsync({ student_ids });
      toast.success("Đã lưu danh sách học sinh.");
      onClose();
    } catch {
      // handled in onError
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-students-title"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id="edit-class-students-title" className="text-lg font-semibold text-text-primary">
            Chỉnh sửa học sinh trong lớp
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
          <div className="flex flex-wrap gap-2">
            {selectedStudents.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary"
              >
                {s.name}
                <button
                  type="button"
                  onClick={() => setSelectedStudents((prev) => prev.filter((x) => x.id !== s.id))}
                  className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label={`Bỏ ${s.name}`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="relative" ref={studentSearchRef}>
            <input
              type="text"
              value={studentSearchInput}
              onChange={(e) => setStudentSearchInput(e.target.value)}
              onFocus={() => setStudentSearchFocused(true)}
              placeholder="Tìm kiếm học sinh theo tên..."
              className="w-full rounded-md outline outline-1 outline-border-default outline-offset-0 bg-bg-surface px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-border-focus focus:outline-offset-0"
              aria-label="Tìm kiếm học sinh"
              aria-autocomplete="list"
              aria-expanded={studentSearchFocused}
            />
            {studentSearchFocused &&
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
                  {filteredStudents.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-text-muted">
                      {studentSearchInput.trim()
                        ? "Không tìm thấy kết quả"
                        : "Nhập tên để tìm kiếm học sinh"}
                    </p>
                  ) : (
                    filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        onClick={() => {
                          setSelectedStudents((prev) => [
                            ...prev,
                            { id: s.id, name: (s.fullName?.trim() ?? "") || s.id },
                          ]);
                          setStudentSearchInput("");
                          setStudentSearchFocused(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-tertiary focus:bg-bg-tertiary focus:outline-none focus-visible:ring-0"
                      >
                        {(s.fullName?.trim() ?? "") || s.id}
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
