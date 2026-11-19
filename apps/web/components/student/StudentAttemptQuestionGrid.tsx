"use client";

import type { Ref } from "react";
import { cn } from "@/lib/utils";
import type { AttemptQuestionDto } from "@/dtos/attempt.dto";
import { getAttemptQuestionVisualStatus } from "@/lib/attempt-autosave.helpers";

function cellClass(status: ReturnType<typeof getAttemptQuestionVisualStatus>) {
  switch (status) {
    case "marked_for_review":
      return "border-warning bg-warning/15 text-warning";
    case "answered":
      return "border-primary bg-primary text-text-inverse";
    default:
      return "border-border-default bg-bg-surface text-text-muted";
  }
}

function LegendSwatch({
  status,
  label,
}: {
  status: ReturnType<typeof getAttemptQuestionVisualStatus>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
      <span
        aria-hidden
        className={cn(
          "inline-flex size-5 items-center justify-center rounded border text-[10px] font-semibold",
          cellClass(status),
        )}
      >
        ·
      </span>
      {label}
    </span>
  );
}

export default function StudentAttemptQuestionGrid({
  questions,
  labels,
  className,
  ref,
}: {
  questions: AttemptQuestionDto[];
  /** Nhãn từng ô (đề IT: "1".."24", "II.1", "TC1·3"…). Mặc định 1..n. */
  labels?: string[];
  /** Vị trí (sticky/top…) do trang quyết định. */
  className?: string;
  /** Trang đo chiều cao để thanh dính khác xếp ngay bên dưới. */
  ref?: Ref<HTMLElement>;
}) {
  const scrollToQuestion = (questionId: string) => {
    document
      .getElementById(`attempt-q-${questionId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      ref={ref}
      className={cn(
        "z-20 rounded-2xl border border-border-default bg-bg-surface/95 px-3 py-2 backdrop-blur lg:py-3 supports-[backdrop-filter]:bg-bg-surface/80",
        className,
      )}
      aria-label="Danh sách câu hỏi"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 lg:mb-2">
        <LegendSwatch status="unanswered" label="Chưa làm" />
        <LegendSwatch status="answered" label="Đã làm" />
        <LegendSwatch status="marked_for_review" label="Quay lại" />
      </div>
      {/* Mobile: một hàng vuốt ngang — thanh này dính đầu trang, lưới nhiều
          hàng (đề 30–40 câu) che gần hết chỗ đọc đề. Desktop: lưới cột đều,
          mọi ô cùng kích thước, kể cả nhãn dài "TC1·3". */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {questions.map((q, index) => {
          const status = getAttemptQuestionVisualStatus(q);
          const label = labels?.[index] ?? String(index + 1);
          return (
            <button
              key={q.questionId}
              type="button"
              onClick={() => scrollToQuestion(q.questionId)}
              aria-label={`Câu ${label}${
                status === "answered"
                  ? ", đã làm"
                  : status === "marked_for_review"
                    ? ", đánh dấu quay lại"
                    : ", chưa làm"
              }`}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border px-0.5 font-semibold tabular-nums lg:w-full lg:min-w-0",
                label.length > 4 ? "text-[10px] tracking-tight" : "text-xs",
                cellClass(status),
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
