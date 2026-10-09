"use client";

import StudentAttemptQuestion from "@/components/student/StudentAttemptQuestion";
import type { AttemptQuestionDto } from "@/dtos/attempt.dto";
import { QuestionTypeDto, countBlanks } from "@/dtos/question.dto";
import { resizeBlankKey } from "@/lib/fill-blank";
import type { QuestionFormValue } from "@/components/admin/question/QuestionFormFields";
import SharedMaterialPanel from "@/components/student/SharedMaterialPanel";

const NOOP = () => {};

/** HTML editor rỗng (`<p></p>`) nhưng vẫn giữ node công thức (phần tử rỗng có `data-latex`). */
function isBlankHtml(html: string): boolean {
  if (/data-latex=/i.test(html)) return false;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";
}

function optionalHtml(html: string): string | null {
  return isBlankHtml(html) ? null : html;
}

/**
 * Xem trước câu hỏi đúng như học sinh thấy sau khi nộp bài (đáp án đúng + giải thích),
 * dùng chính `StudentAttemptQuestion` để render LaTeX/HTML giống hệt phía học sinh.
 */
export default function QuestionPreview({
  value,
  sharedMaterialContent,
  sharedMaterialAudioUrl,
  questionId,
}: {
  value: QuestionFormValue;
  /** Tư liệu dùng chung đang gắn (HTML) — hiện trên câu như học sinh thấy. */
  sharedMaterialContent?: string;
  sharedMaterialAudioUrl?: string | null;
  /** Id câu đang sửa — vị trí trống nối tới câu này hiện số 1 trong xem trước. */
  questionId?: string;
}) {
  if (isBlankHtml(value.content)) {
    return (
      <p className="rounded-xl border border-dashed border-border-default px-4 py-6 text-center text-sm text-text-muted">
        Nhập nội dung câu hỏi để xem trước.
      </p>
    );
  }

  const isChoice = value.type === QuestionTypeDto.single_choice;
  const isTrueFalse = value.type === QuestionTypeDto.true_false_group;
  const isSingleTf = value.type === QuestionTypeDto.true_false;
  const isFillBlank = value.type === QuestionTypeDto.fill_blank;
  const isOrdering = value.type === QuestionTypeDto.ordering;
  const blankCount = isFillBlank ? countBlanks(value.content) : null;
  const question: AttemptQuestionDto = {
    questionId: "preview",
    order: 0,
    pointsPossible: 0,
    type: value.type,
    slot: "required",
    content: value.content,
    options:
      isChoice || isOrdering
        ? value.options
        : isTrueFalse
          ? value.statements
          : null,
    choiceIndex: null,
    essayAnswer: null,
    tfChoices: null,
    tfAnswerKey: isTrueFalse
      ? value.tfAnswerKey
      : isSingleTf
        ? value.tfAnswerKey.slice(0, 1)
        : undefined,
    tfLabelStyle: isSingleTf ? value.tfLabelStyle : null,
    blankCount,
    blankAnswers: null,
    orderAnswer: null,
    orderingKey: isOrdering ? value.options : null,
    blankAnswerKey:
      blankCount != null
        ? resizeBlankKey(value.blankAnswerKey, blankCount).map((answers) =>
            answers.map((a) => a.trim()).filter(Boolean),
          )
        : null,
    markedForReview: false,
    audioUrl: value.audio?.url,
    correctIndex: isChoice ? value.correctIndex : null,
    isCorrect: null,
    explanation: optionalHtml(value.explanation),
    answerGuide: optionalHtml(value.answerGuide),
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted">
        Hiển thị như học sinh thấy khi xem lại bài (kèm đáp án đúng và giải thích).
      </p>
      {sharedMaterialContent ? (
        <SharedMaterialPanel
          header={{
            content: sharedMaterialContent,
            audioUrl: sharedMaterialAudioUrl,
            firstNumber: 1,
            lastNumber: 1,
          }}
          gapNumbers={new Map(questionId ? [[questionId, 1]] : [])}
        />
      ) : null}
      <StudentAttemptQuestion
        question={question}
        index={0}
        disabled
        reveal
        hidePoints
        onChange={NOOP}
      />
    </div>
  );
}
