"use client";

import { useEffect } from "react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthNavProps {
  /** Giá trị YYYY-MM */
  value: string;
  onChange: (value: string) => void;
  monthPopupOpen: boolean;
  setMonthPopupOpen: (open: boolean) => void;
  /** Ví dụ: "12 buổi" */
  countLabel?: string;
  /** Nút bên phải (vd. "+ Thêm buổi học") */
  actionButton?: React.ReactNode;
}

export default function MonthNav({
  value,
  onChange,
  monthPopupOpen,
  setMonthPopupOpen,
  countLabel,
  actionButton,
}: MonthNavProps) {
  const [selectedYear, selectedMonthValue] = value.split("-");
  const monthNum = parseInt(selectedMonthValue, 10);
  const monthLabel = `Tháng ${monthNum}/${selectedYear}`;

  const handleMonthChange = (delta: number) => {
    let newMonth = parseInt(selectedMonthValue, 10) + delta;
    let newYear = parseInt(selectedYear, 10);
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onChange(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const handleYearChange = (delta: number) => {
    const newYear = parseInt(selectedYear, 10) + delta;
    onChange(`${newYear}-${selectedMonthValue}`);
  };

  const handleMonthSelect = (monthVal: string) => {
    onChange(`${selectedYear}-${monthVal}`);
    setMonthPopupOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (monthPopupOpen && !target.closest("[data-month-nav]")) {
        setMonthPopupOpen(false);
      }
    };
    if (monthPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [monthPopupOpen, setMonthPopupOpen]);

  const hasLeft = countLabel != null;
  const hasRight = actionButton != null;

  return (
    <div
      className={
        hasLeft || hasRight
          ? "grid w-full grid-cols-[auto_1fr_auto] items-center gap-2.5 sm:grid-cols-[1fr_auto_1fr]"
          : "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center"
      }
    >
      {hasLeft ? (
        <div className="text-sm text-text-muted sm:justify-self-start">{countLabel}</div>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}

      <div data-month-nav className="relative flex w-full items-center justify-center sm:w-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMonthChange(-1)}
            title="Tháng trước"
            className="flex size-10 items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-primary shadow-sm transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:size-9"
            aria-label="Tháng trước"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M12.78 15.53a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setMonthPopupOpen(!monthPopupOpen)}
            title="Chọn tháng, năm"
            className="min-h-10 min-w-[160px] rounded-lg border border-border-default bg-bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-9 sm:min-w-[140px] sm:px-3"
            aria-expanded={monthPopupOpen}
            aria-haspopup="dialog"
          >
            <span className="whitespace-nowrap">{monthLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => handleMonthChange(1)}
            title="Tháng sau"
            className="flex size-10 items-center justify-center rounded-lg border border-border-default bg-bg-surface text-text-primary shadow-sm transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:size-9"
            aria-label="Tháng sau"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M7.22 4.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {monthPopupOpen && (
          <div
            role="dialog"
            aria-label="Chọn tháng"
            className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-xl border border-border-default bg-bg-surface p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleYearChange(-1)}
                className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Năm trước"
              >
                <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M12.78 15.53a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L8.31 10l4.47 4.47a.75.75 0 0 1 0 1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <span className="text-sm font-semibold text-text-primary">{selectedYear}</span>
              <button
                type="button"
                onClick={() => handleYearChange(1)}
                className="flex size-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Năm sau"
              >
                <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M7.22 4.47a.75.75 0 0 1 1.06 0l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06L11.69 10 7.22 5.53a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {MONTH_NAMES.map((label, idx) => {
                const val = String(idx + 1).padStart(2, "0");
                const isActive = val === selectedMonthValue;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleMonthSelect(val)}
                    className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
                      isActive
                        ? "border border-primary text-primary"
                        : "text-text-primary hover:bg-bg-tertiary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hasRight ? (
        <div className="shrink-0 justify-self-end sm:justify-self-end">{actionButton}</div>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}
    </div>
  );
}
