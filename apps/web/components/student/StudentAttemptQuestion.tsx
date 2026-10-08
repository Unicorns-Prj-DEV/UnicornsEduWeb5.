"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import MathContent from "@/components/ui/MathContent";
import type {
  AttemptQuestionDto,
  AttemptScoringDto,
  TrueFalseChoices,
} from "@/dtos/attempt.dto";
import { formatScoreValue } from "@/lib/attempt-score";
import TrueFalseStatements from "@/components/student/TrueFalseStatements";
import { CONTENT_LIMITS, overLimitMessage } from "@/dtos/content-limits";

export default function StudentAttemptQuestion({
  question,
  index,
  number,
  scoring = "equal_100",
  disabled,
  reveal,
  hidePoints = false,
  onChange,
}: {
  question: AttemptQuestionDto;
  index: number;
  /** Số hiển thị "Câu n" (đề IT đánh số lại ở Phần II). Mặc định index + 1. */
  number?: number;
  scoring?: AttemptScoringDto;
  disabled: boolean;
  reveal: boolean;
  /** Xem trước khi soạn: điểm chỉ chốt lúc giao đề (100/N). */
  hidePoints?: boolean;
  onChange: (val: {
    choiceIndex?: number | null;
    essayAnswer?: string | null;
    tfChoices?: TrueFalseChoices | null;
    markedForReview?: boolean;
  }) => void;
}) {
  const isMcq = question.type === "single_choice";
  const isTrueFalse = question.type === "true_false_group";
  const isEssay = question.type === "essay";
  const options = question.options ?? [];
  const canMark = !disabled && !reveal;
  const marked = question.markedForReview ?? false;
  // Câu tự chọn học sinh không chạm vào (thường là nhóm không chọn): xem lại
  // không tô xanh/đỏ.
  const untouchedElective =
    isTrueFalse &&
    question.slot !== "required" &&
    !(question.tfChoices ?? []).some((c) => typeof c === "boolean");
  const graded = reveal && question.isCorrect != null && !untouchedElective;

  return (
    <div
      id={`attempt-q-${question.questionId}`}
      className={cn(
        "scroll-mt-28 rounded-2xl border p-4 sm:p-5",
        graded &&
          question.isCorrect === true &&
          "border-success/30 bg-success/5",
        graded && question.isCorrect === false && "border-error/30 bg-error/5",
        !graded && "border-border-default bg-bg-surface",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-sm font-medium text-text-primary">
          <span className="mr-1 text-primary">Câu {number ?? index + 1}.</span>
          <MathContent
            content={question.content}
            className="inline [&>p:first-child]:inline"
          />
          {hidePoints ? null : (
            <span className="ml-2 text-[11px] font-normal text-text-muted">
              {reveal && question.pointsAwarded != null
                ? `${formatScoreValue(question.pointsAwarded, scoring)}/`
                : ""}
              {formatScoreValue(question.pointsPossible, scoring)} điểm
            </span>
          )}
        </div>
        {canMark ? (
          <button
            type="button"
            onClick={() => onChange({ markedForReview: !marked })}
            aria-pressed={marked}
            aria-label={marked ? "Bỏ đánh dấu quay lại" : "Đánh dấu quay lại"}
            title={marked ? "Bỏ đánh dấu quay lại" : "Đánh dấu quay lại"}
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
              marked
                ? "border-warning bg-warning/15 text-warning"
                : "border-border-default text-text-muted hover:border-warning/50 hover:text-warning",
            )}
          >
            <Bookmark className={cn("size-4", marked && "fill-current")} />
          </button>
        ) : marked ? (
          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-warning/40 bg-warning/10 text-warning"
            aria-label="Đã đánh dấu quay lại"
            title="Đánh dấu quay lại"
          >
            <Bookmark className="size-4 fill-current" />
          </span>
        ) : null}
      </div>

      {isMcq ? (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label
              key={i}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                disabled ? "cursor-default" : "cursor-pointer",
                question.choiceIndex === i
                  ? "border-primary bg-primary/5 text-text-primary"
                  : "border-border-default text-text-secondary",
              )}
            >
              <input
                type="radio"
                name={`q-${question.questionId}`}
                checked={question.choiceIndex === i}
                disabled={disabled}
                onChange={() => onChange({ choiceIndex: i })}
                className="accent-primary"
              />
              <span className="mr-1 font-medium text-text-muted">
                {String.fromCharCode(65 + i)}.
              </span>
              <MathContent content={opt} className="text-sm" />
            </label>
          ))}
        </div>
      ) : isTrueFalse ? (
        <TrueFalseStatements
          name={`q-${question.questionId}`}
          statements={options}
          choices={question.tfChoices}
          answerKey={reveal ? question.tfAnswerKey : undefined}
          disabled={disabled}
          reveal={reveal}
          neutralWhenBlank={question.slot !== "required"}
          onChange={(tfChoices) => onChange({ tfChoices })}
        />
      ) : (
        <textarea
          value={question.essayAnswer ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ essayAnswer: e.target.value })}
          aria-label="Nhập câu trả lời"
          placeholder="Nhập câu trả lời..."
          rows={5}
          aria-invalid={
            (question.essayAnswer?.length ?? 0) > CONTENT_LIMITS.essayAnswer
          }
          className="w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        />
      )}
      {isEssay &&
        (question.essayAnswer?.length ?? 0) > CONTENT_LIMITS.essayAnswer && (
          <p className="mt-1 text-xs text-error">
            {overLimitMessage("Câu trả lời", CONTENT_LIMITS.essayAnswer)}
          </p>
        )}

      {reveal && isMcq && question.correctIndex != null && (
        <div className="mt-3 text-xs text-text-muted">
          Đáp án đúng:{" "}
          <span className="inline-flex flex-wrap items-baseline gap-1 font-medium text-success">
            <span>{String.fromCharCode(65 + question.correctIndex)}.</span>
            <MathContent
              content={options[question.correctIndex] ?? ""}
              className="inline text-xs text-success [&_.katex]:text-success"
            />
          </span>
        </div>
      )}
      {reveal && question.explanation && (
        <div className="mt-2 rounded-lg bg-bg-secondary/50 p-2.5">
          <span className="text-xs font-semibold text-text-muted">
            Giải thích:{" "}
          </span>
          <MathContent
            content={question.explanation}
            className="text-xs text-text-secondary"
          />
        </div>
      )}
      {reveal && question.type === "essay" && question.answerGuide && (
        <div className="mt-2 rounded-lg bg-bg-secondary/50 p-2.5">
          <span className="text-xs font-semibold text-text-muted">
            Hướng dẫn:{" "}
          </span>
          <MathContent
            content={question.answerGuide}
            className="text-xs text-text-secondary"
          />
        </div>
      )}
    </div>
  );
}
