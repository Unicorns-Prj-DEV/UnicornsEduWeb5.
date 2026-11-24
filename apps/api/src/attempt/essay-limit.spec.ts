import { BadRequestException } from '@nestjs/common';
import { assertEssayWithinLimit } from './essay-limit';

describe('assertEssayWithinLimit', () => {
  const questions = [
    { questionId: 'q1', essayMaxChars: 5 },
    { questionId: 'q2', essayMaxChars: null },
  ];

  it('cho qua khi đúng bằng giới hạn hoặc câu không giới hạn', () => {
    expect(() =>
      assertEssayWithinLimit(questions, [
        { questionId: 'q1', essayAnswer: 'わたしは日' },
        { questionId: 'q2', essayAnswer: 'x'.repeat(10_000) },
      ]),
    ).not.toThrow();
  });

  it('bỏ qua câu trả lời rỗng / không gửi essayAnswer / câu lạ', () => {
    expect(() =>
      assertEssayWithinLimit(questions, [
        { questionId: 'q1', essayAnswer: null },
        { questionId: 'q1' },
        { questionId: 'qx', essayAnswer: 'x'.repeat(99) },
      ]),
    ).not.toThrow();
  });

  it('chặn khi vượt giới hạn', () => {
    expect(() =>
      assertEssayWithinLimit(questions, [
        { questionId: 'q1', essayAnswer: '123456' },
      ]),
    ).toThrow(BadRequestException);
  });
});
