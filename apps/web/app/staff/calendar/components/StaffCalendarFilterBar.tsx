"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { ClassScheduleFilter } from "@/dtos/class-schedule.dto";
import * as staffCalendarApi from "@/lib/apis/staff-calendar.api";
import { cn } from "@/lib/utils";

interface StaffCalendarFilterBarProps {
  filters: Pick<ClassScheduleFilter, "classId">;
  weekLabel: string;
  onFiltersChange: (filters: Pick<ClassScheduleFilter, "classId">) => void;
}

type ClassFilterOption = {
  id: string;
  name: string;
};

const CLASS_QUERY_LIMIT = 12;

export default function StaffCalendarFilterBar({
  filters,
  weekLabel,
  onFiltersChange,
}: StaffCalendarFilterBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedClassSnapshot, setSelectedClassSnapshot] =
    useState<ClassFilterOption | null>(null);
  const [debouncedSearch] = useDebounce(searchInput.trim(), 250);

  const { data: classListResponse, isLoading: isLoadingClasses, isFetching } = useQuery({
    queryKey: ["staffCalendar", "classes", "filter", debouncedSearch],
    queryFn: () =>
      staffCalendarApi.getStaffClassesForFilter({
        limit: CLASS_QUERY_LIMIT,
        search: debouncedSearch || undefined,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const classOptions = useMemo<ClassFilterOption[]>(() => {
    return (classListResponse?.data ?? []).map((cls) => ({
      id: cls.id,
      name: cls.name,
    }));
  }, [classListResponse]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectedClass = useMemo(() => {
    if (!filters.classId) {
      return null;
    }

    const matched = classOptions.find((option) => option.id === filters.classId);
    if (matched) {
      return matched;
    }

    return selectedClassSnapshot?.id === filters.classId
      ? selectedClassSnapshot
      : null;
  }, [classOptions, filters.classId, selectedClassSnapshot]);

  const handleClassChange = useCallback((nextClass: ClassFilterOption) => {
    setSelectedClassSnapshot(nextClass);
    setSearchInput("");
    setIsSearchFocused(false);
    onFiltersChange({
      classId: nextClass.id,
    });
  }, [onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    setSelectedClassSnapshot(null);
    setSearchInput("");
    setIsSearchFocused(false);
    onFiltersChange({});
  }, [onFiltersChange]);

  const listboxId = "staff-calendar-class-filter-options";
  const hasSearchText = searchInput.trim().length > 0;
  const shouldShowDropdown = isSearchFocused;
  const selectedLabel = selectedClass?.name ?? "";

  return (
    <section className="relative overflow-visible rounded-[1.5rem] border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 left-10 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text-primary">Bộ lọc Lịch</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Chọn lớp để thu hẹp lịch tuần hiện tại.
          </p>
        </div>

        <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-border-default bg-bg-surface/90 px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm backdrop-blur">
          <svg
            className="size-3.5 shrink-0 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="truncate">{weekLabel}</span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div>
          <label htmlFor="staff-class-filter-search" className="block text-sm font-medium text-text-secondary">
            Lớp học
          </label>
          <div className="mt-1 space-y-2">
            {selectedClass ? (
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <span className="truncate">{selectedLabel}</span>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-full p-0.5 text-primary/80 transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label={`Bỏ lọc lớp ${selectedLabel}`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null}

            <div className="relative" ref={containerRef}>
              <div
                className={cn(
                  "flex min-h-11 items-center rounded-xl border bg-bg-surface px-3 shadow-sm transition-[border-color,box-shadow,background-color] duration-200",
                  isSearchFocused
                    ? "border-border-focus ring-2 ring-border-focus/30"
                    : "border-border-default",
                )}
              >
                <svg
                  className="size-4 shrink-0 text-text-muted"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>
                <input
                  id="staff-class-filter-search"
                  name="staff_class_filter_search"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  role="combobox"
                  aria-haspopup="listbox"
                  aria-expanded={shouldShowDropdown}
                  aria-controls={shouldShowDropdown ? listboxId : undefined}
                  aria-autocomplete="list"
                  placeholder={
                    selectedClass
                      ? `Đổi lớp khác theo tên…`
                      : isLoadingClasses
                        ? "Đang tải danh sách lớp…"
                        : "Tìm lớp theo tên…"
                  }
                  className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
                {hasSearchText ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="rounded-full p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label="Xóa từ khóa tìm lớp"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>

              {shouldShowDropdown ? (
                <div
                  id={listboxId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border-default bg-bg-surface py-1 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
                >
                  {isFetching ? (
                    <p className="px-3 py-2 text-sm text-text-muted" aria-live="polite">
                      Đang tìm lớp…
                    </p>
                  ) : classOptions.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-text-muted">
                      {hasSearchText
                        ? "Không tìm thấy lớp phù hợp."
                        : "Chưa có lớp nào để lọc."}
                    </p>
                  ) : (
                    classOptions.map((option) => {
                      const isSelected = option.id === filters.classId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleClassChange(option)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus/40",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "text-text-primary hover:bg-bg-tertiary focus:bg-bg-tertiary",
                          )}
                        >
                          <span className="truncate">{option.name}</span>
                          {isSelected ? (
                            <span className="shrink-0 text-xs font-semibold">Đang lọc</span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {filters.classId && (
          <div className="xl:pb-0.5">
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 xl:w-auto xl:min-w-36"
              aria-label="Xóa bộ lọc"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
