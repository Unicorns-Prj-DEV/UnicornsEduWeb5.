"use client";

import { m } from "framer-motion";
import {
  STUDENT_CLASS_TAB_LABELS,
  STUDENT_CLASS_TABS,
  type StudentClassTab,
} from "@/lib/student-class-tabs";

/** Thanh tab Chuyên đề / Buổi học, cùng kiểu pill với tab trang khoá học. */
export default function StudentClassTabs({
  activeTab,
  counts,
  onSelect,
}: {
  activeTab: StudentClassTab;
  counts: Record<StudentClassTab, number>;
  onSelect: (tab: StudentClassTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Nội dung lớp học"
      className="flex w-full items-center gap-1 rounded-2xl border border-border-default bg-bg-secondary/70 p-1.5 shadow-xs sm:w-auto sm:self-start"
    >
      {STUDENT_CLASS_TABS.map((tab) => {
        const selected = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`student-class-tab-${tab}`}
            aria-selected={selected}
            aria-controls="student-class-tabpanel"
            onClick={() => onSelect(tab)}
            className="relative z-10 flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:min-h-10 sm:flex-none sm:px-4"
          >
            {selected ? (
              <m.span
                layoutId="student-class-tab-pill"
                className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ) : null}
            <span className={selected ? "text-text-inverse" : "text-text-secondary"}>
              {STUDENT_CLASS_TAB_LABELS[tab]}
            </span>
            <span
              className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                selected
                  ? "bg-white/20 text-text-inverse"
                  : "bg-bg-surface text-text-muted"
              }`}
            >
              {counts[tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
