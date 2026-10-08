jest.mock('../../generated/client', () => ({}));

import { AttemptScoring, QuestionSlot, QuestionType } from 'generated/enums';
import { regradeQuestionAnswerKey } from './regrade';

function answer(over: Record<string, unknown>) {
  return {
    id: 'a',
    questionId: 'q',
    type: QuestionType.single_choice,
    slot: QuestionSlot.required,
    pointsPossible: 25,
    choiceIndex: 2,
    correctIndex: 1,
    tfChoices: null,
    tfAnswerKey: [],
    isCorrect: false,
    pointsAwarded: 0,
    ...over,
  };
}

function makeTx(attempts: unknown[], shuffledRows: unknown[] = []) {
  return {
    attemptAnswer: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue(shuffledRows),
      update: jest.fn().mockResolvedValue({}),
    },
    attempt: {
      findMany: jest.fn().mockResolvedValue(attempts),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('regradeQuestionAnswerKey', () => {
  it('không đổi đáp án → không làm gì', async () => {
    const tx = makeTx([]);
    expect(await regradeQuestionAnswerKey(tx as never, 'q', {})).toBe(0);
    expect(tx.attemptAnswer.updateMany).not.toHaveBeenCalled();
  });

  it('sửa correctIndex → ghi snapshot + chấm lại bài đã nộp', async () => {
    // Snapshot findMany trả về đã có đáp án mới (updateMany chạy trước).
    const tx = makeTx([
      {
        id: 'att-1',
        scoring: AttemptScoring.absolute_it,
        answers: [
          answer({ id: 'a1', correctIndex: 2 }),
          answer({
            id: 'a2',
            questionId: 'other',
            choiceIndex: 0,
            correctIndex: 0,
            isCorrect: true,
            pointsAwarded: 25,
          }),
        ],
      },
    ]);

    const n = await regradeQuestionAnswerKey(tx as never, 'q', {
      correctIndex: 2,
    });

    expect(n).toBe(1);
    expect(tx.attemptAnswer.updateMany).toHaveBeenCalledWith({
      where: { questionId: 'q', optionOrder: { isEmpty: true } },
      data: { correctIndex: 2 },
    });
    // Chỉ câu thay đổi mới được ghi.
    expect(tx.attemptAnswer.update).toHaveBeenCalledTimes(1);
    expect(tx.attemptAnswer.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { isCorrect: true, pointsAwarded: 25 },
    });
    expect(tx.attempt.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: { autoGradedScore: 50, autoGradedMax: 50, electiveVoided: false },
    });
  });

  it('sửa tfAnswerKey → điểm Đúng/Sai theo bậc thang mới, giữ điểm tự luận', async () => {
    const tx = makeTx([
      {
        id: 'att-2',
        scoring: AttemptScoring.absolute_it,
        answers: [
          answer({
            id: 'tf',
            type: QuestionType.true_false_group,
            pointsPossible: 100,
            choiceIndex: null,
            correctIndex: null,
            tfChoices: [true, true, true, true],
            tfAnswerKey: [true, true, true, false],
            pointsAwarded: 25,
          }),
          answer({
            id: 'es',
            questionId: 'e',
            type: QuestionType.essay,
            pointsAwarded: 40,
          }),
        ],
      },
    ]);

    await regradeQuestionAnswerKey(tx as never, 'q', {
      tfAnswerKey: [true, true, true, false],
    });

    expect(tx.attemptAnswer.update).toHaveBeenCalledTimes(1);
    expect(tx.attemptAnswer.update).toHaveBeenCalledWith({
      where: { id: 'tf' },
      data: { isCorrect: false, pointsAwarded: 50 },
    });
    expect(tx.attempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          answers: { some: { questionId: 'q' } },
        }),
      }),
    );
  });

  it('snapshot đã đảo đáp án → đổi đáp án mới sang thứ tự hiển thị của lượt', async () => {
    // Lượt x: hiển thị [c, a, d, b]; lượt y: Đúng/Sai hiển thị [d, c, b, a].
    const tx = makeTx(
      [],
      [
        { id: 'x', optionOrder: [2, 0, 3, 1] },
        { id: 'y', optionOrder: [3, 2, 1, 0] },
      ],
    );
    await regradeQuestionAnswerKey(tx as never, 'q', {
      correctIndex: 3,
      tfAnswerKey: [true, true, false, false],
    });
    expect(tx.attemptAnswer.update).toHaveBeenCalledWith({
      where: { id: 'x' },
      data: { correctIndex: 2, tfAnswerKey: [false, true, false, true] },
    });
    expect(tx.attemptAnswer.update).toHaveBeenCalledWith({
      where: { id: 'y' },
      data: { correctIndex: 0, tfAnswerKey: [false, false, true, true] },
    });
  });
});
