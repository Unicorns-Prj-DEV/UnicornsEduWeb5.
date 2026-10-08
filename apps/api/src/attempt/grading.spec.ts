import { AttemptScoring, QuestionSlot, QuestionType } from 'generated/enums';
import {
  GradableAnswer,
  autoGradedMaxOf,
  gradeAnswers,
  gradeTrueFalse,
  isElectiveVoided,
  normalizeTrueFalseChoices,
} from './grading';

const KEY = [true, false, true, false];

let seq = 0;
function sc(correct: boolean, slot = QuestionSlot.required): GradableAnswer {
  return {
    id: `sc-${seq++}`,
    type: QuestionType.single_choice,
    slot,
    pointsPossible: 25,
    choiceIndex: correct ? 1 : 0,
    correctIndex: 1,
    tfChoices: null,
    tfAnswerKey: [],
  };
}
function tf(
  choices: (boolean | null)[] | null,
  slot: QuestionSlot = QuestionSlot.required,
): GradableAnswer {
  return {
    id: `tf-${seq++}`,
    type: QuestionType.true_false_group,
    slot,
    pointsPossible: 100,
    choiceIndex: null,
    correctIndex: null,
    tfChoices: choices,
    tfAnswerKey: KEY,
  };
}

/** Đề chuẩn THPT Tin: 24 trắc nghiệm + 2 Đúng/Sai bắt buộc + 2 + 2 tự chọn. */
function standardExam(opts: {
  scCorrect: number;
  required: (boolean | null)[][];
  e1: ((boolean | null)[] | null)[];
  e2: ((boolean | null)[] | null)[];
}): GradableAnswer[] {
  return [
    ...Array.from({ length: 24 }, (_, i) => sc(i < opts.scCorrect)),
    ...opts.required.map((c) => tf(c)),
    ...opts.e1.map((c) => tf(c, QuestionSlot.elective_1)),
    ...opts.e2.map((c) => tf(c, QuestionSlot.elective_2)),
  ];
}

describe('normalizeTrueFalseChoices', () => {
  it('pads to 4 and drops non-boolean', () => {
    expect(normalizeTrueFalseChoices([true, 'x', false])).toEqual([
      true,
      null,
      false,
      null,
    ]);
    expect(normalizeTrueFalseChoices(null)).toEqual([null, null, null, null]);
  });
});

describe('gradeTrueFalse — bậc thang 0 / 0,1 / 0,25 / 0,5 / 1', () => {
  it.each([
    [[false, true, false, true], 0, 0],
    [[true, true, false, true], 1, 10],
    [[true, false, false, true], 2, 25],
    [[true, false, true, true], 3, 50],
    [[true, false, true, false], 4, 100],
  ])('%j → %i đúng, %i điểm', (choices, correct, points) => {
    expect(gradeTrueFalse(KEY, choices, 100)).toEqual({ correct, points });
  });

  it('nhận định bỏ trống không tính đúng', () => {
    expect(gradeTrueFalse(KEY, [true, null, null, null], 100)).toEqual({
      correct: 1,
      points: 10,
    });
  });
});

describe('isElectiveVoided', () => {
  it('chỉ một nhóm có lựa chọn → không voided', () => {
    expect(
      isElectiveVoided([
        tf(KEY, QuestionSlot.elective_1),
        tf(null, QuestionSlot.elective_2),
        tf([null, null, null, null], QuestionSlot.elective_2),
      ]),
    ).toBe(false);
  });
  it('cả hai nhóm đều có ≥1 nhận định được chọn → voided', () => {
    expect(
      isElectiveVoided([
        tf(KEY, QuestionSlot.elective_1),
        tf([null, null, true, null], QuestionSlot.elective_2),
      ]),
    ).toBe(true);
  });
});

describe('gradeAnswers — đề chuẩn 24 + 2 + 2 + 2 (absolute_it)', () => {
  it('đúng hết, làm một nhóm tự chọn → 10,00 / 10,00', () => {
    const r = gradeAnswers(
      standardExam({
        scCorrect: 24,
        required: [KEY, KEY],
        e1: [KEY, KEY],
        e2: [null, null],
      }),
      AttemptScoring.absolute_it,
    );
    expect(r.autoGradedScore).toBe(1000);
    expect(r.autoGradedMax).toBe(1000);
    expect(r.electiveVoided).toBe(false);
    expect(r.hasUngradedEssay).toBe(false);
  });

  it('làm cả hai nhóm tự chọn → phần tự chọn 0, tối đa 8,00', () => {
    const r = gradeAnswers(
      standardExam({
        scCorrect: 24,
        required: [KEY, KEY],
        e1: [KEY, KEY],
        e2: [[true, null, null, null], null],
      }),
      AttemptScoring.absolute_it,
    );
    expect(r.electiveVoided).toBe(true);
    expect(r.autoGradedScore).toBe(800);
    expect(r.autoGradedMax).toBe(1000);
    const electivePatches = r.patches.slice(26);
    expect(electivePatches.every((p) => p.pointsAwarded === 0)).toBe(true);
    // isCorrect vẫn phản ánh đáp án để xem lại
    expect(electivePatches[0].isCorrect).toBe(true);
  });

  it('điểm lẻ: 20 trắc nghiệm + Đúng/Sai 3 ý + 2 ý', () => {
    const r = gradeAnswers(
      standardExam({
        scCorrect: 20,
        required: [
          [true, false, true, true],
          [true, false, false, true],
        ],
        e1: [],
        e2: [KEY, [false, true, false, true]],
      }),
      AttemptScoring.absolute_it,
    );
    // 20×25 + 50 + 25 + 100 + 0
    expect(r.autoGradedScore).toBe(675);
  });

  it('essay → patch null và hasUngradedEssay', () => {
    const essay: GradableAnswer = {
      ...sc(false),
      type: QuestionType.essay,
      pointsPossible: 50,
    };
    const r = gradeAnswers([sc(true), essay], AttemptScoring.equal_100);
    expect(r.patches[1]).toEqual({
      id: essay.id,
      isCorrect: null,
      pointsAwarded: null,
    });
    expect(r.hasUngradedEssay).toBe(true);
    expect(r.autoGradedMax).toBe(25);
  });
});

describe('autoGradedMaxOf', () => {
  it('equal_100 cộng mọi câu tự chấm, absolute_it chỉ tính nhóm tự chọn lớn hơn', () => {
    const answers = standardExam({
      scCorrect: 0,
      required: [KEY, KEY],
      e1: [KEY, KEY],
      e2: [KEY, KEY],
    });
    expect(autoGradedMaxOf(answers, AttemptScoring.absolute_it)).toBe(1000);
    expect(autoGradedMaxOf(answers, AttemptScoring.equal_100)).toBe(1200);
  });
});
