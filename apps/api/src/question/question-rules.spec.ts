import { lmsProfileConfig } from '../lms-profile/lms-profile';
import { questionShapeError, questionSkillsError } from './question-rules';

const IT = lmsProfileConfig('it');
const JP = lmsProfileConfig('jp');
const opts = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

describe('questionShapeError', () => {
  it('IT từ chối tự luận, JP nhận', () => {
    expect(questionShapeError({ type: 'essay' }, IT)).toBe(
      'Hồ sơ Tin học không có câu tự luận.',
    );
    expect(questionShapeError({ type: 'essay', options: [] }, JP)).toBeNull();
  });
  it('JP từ chối Đúng/Sai', () => {
    expect(
      questionShapeError(
        {
          type: 'true_false_group',
          options: opts(4),
          tfAnswerKey: [true, true, true, true],
        },
        JP,
      ),
    ).toMatch('không hỗ trợ câu Đúng/Sai');
  });
  it.each([2, 4, 6])('trắc nghiệm %i phương án hợp lệ', (n) => {
    expect(
      questionShapeError(
        { type: 'single_choice', options: opts(n), correctIndex: 0 },
        IT,
      ),
    ).toBeNull();
  });
  it.each([1, 7])('trắc nghiệm %i phương án bị từ chối', (n) => {
    expect(
      questionShapeError(
        { type: 'single_choice', options: opts(n), correctIndex: 0 },
        IT,
      ),
    ).toBe('Câu trắc nghiệm phải có 2–6 phương án.');
  });
  it('trắc nghiệm thiếu / sai đáp án', () => {
    expect(
      questionShapeError({ type: 'single_choice', options: opts(4) }, IT),
    ).toBe('Câu trắc nghiệm phải có đáp án đúng.');
    expect(
      questionShapeError(
        { type: 'single_choice', options: opts(4), correctIndex: 4 },
        IT,
      ),
    ).toBe('Đáp án đúng nằm ngoài danh sách phương án.');
  });
  it('Đúng/Sai cần đúng 4 nhận định + 4 đáp án, không correctIndex', () => {
    const key = [true, false, true, false];
    expect(
      questionShapeError(
        { type: 'true_false_group', options: opts(4), tfAnswerKey: key },
        IT,
      ),
    ).toBeNull();
    expect(
      questionShapeError(
        { type: 'true_false_group', options: opts(3), tfAnswerKey: key },
        IT,
      ),
    ).toMatch('đúng 4 nhận định');
    expect(
      questionShapeError(
        { type: 'true_false_group', options: opts(4), tfAnswerKey: [true] },
        IT,
      ),
    ).toMatch('đủ 4 nhận định');
    expect(
      questionShapeError(
        {
          type: 'true_false_group',
          options: opts(4),
          tfAnswerKey: key,
          correctIndex: 0,
        },
        IT,
      ),
    ).toMatch('correctIndex');
  });
});

describe('Câu Đúng/Sai một nhận định (true_false)', () => {
  const ENG = lmsProfileConfig('eng');
  const ok = { type: 'true_false', options: null, tfAnswerKey: [false] };
  it('JP nhận, kèm kiểu nhãn tuỳ chọn', () => {
    expect(questionShapeError(ok, JP)).toBeNull();
    expect(
      questionShapeError({ ...ok, tfLabelStyle: 'dung_sai' }, JP),
    ).toBeNull();
  });
  it('IT và ENG từ chối', () => {
    expect(questionShapeError(ok, IT)).toMatch(
      'Hồ sơ IT không hỗ trợ câu Đúng/Sai',
    );
    expect(questionShapeError(ok, ENG)).toMatch(
      'Hồ sơ ENG không hỗ trợ câu Đúng/Sai',
    );
  });
  it('phải có đúng một đáp án, không có phương án', () => {
    expect(questionShapeError({ ...ok, tfAnswerKey: [] }, JP)).toBe(
      'Câu Đúng/Sai phải có đáp án Đúng hoặc Sai.',
    );
    expect(questionShapeError({ ...ok, tfAnswerKey: [true, false] }, JP)).toBe(
      'Câu Đúng/Sai phải có đáp án Đúng hoặc Sai.',
    );
    expect(questionShapeError({ ...ok, options: ['x'] }, JP)).toBe(
      'Câu Đúng/Sai không có phương án.',
    );
    expect(questionShapeError({ ...ok, correctIndex: 0 }, JP)).toBe(
      'Câu Đúng/Sai không dùng correctIndex.',
    );
  });
  it('chỉ Câu Đúng/Sai có kiểu nhãn', () => {
    expect(
      questionShapeError({ type: 'essay', tfLabelStyle: 'maru_batsu' }, JP),
    ).toBe('Chỉ Câu Đúng/Sai có kiểu nhãn.');
  });
});

describe('kiểu ô tự luận (essayInputSize)', () => {
  const ENG = lmsProfileConfig('eng');
  it.each(['short', 'long'] as const)('JP nhận tự luận ô %s', (size) => {
    expect(
      questionShapeError({ type: 'essay', essayInputSize: size }, JP),
    ).toBeNull();
  });
  it('ENG từ chối kiểu ô', () => {
    expect(
      questionShapeError({ type: 'essay', essayInputSize: 'short' }, ENG),
    ).toBe('Hồ sơ ENG không có kiểu ô tự luận.');
    expect(questionShapeError({ type: 'essay' }, ENG)).toBeNull();
  });
  it('câu không phải tự luận không có kiểu ô', () => {
    expect(
      questionShapeError(
        {
          type: 'single_choice',
          options: opts(4),
          correctIndex: 0,
          essayInputSize: 'long',
        },
        JP,
      ),
    ).toBe('Chỉ câu tự luận có kiểu ô nhập.');
  });
});

describe('questionSkillsError', () => {
  const ENG = lmsProfileConfig('eng');
  it('JP: tạo / sửa phải có ít nhất một kỹ năng', () => {
    expect(questionSkillsError([], JP)).toBe(
      'Câu hỏi phải chọn ít nhất một kỹ năng.',
    );
    expect(questionSkillsError(['kanji', 'grammar'], JP)).toBeNull();
  });
  it('JP: kỹ năng trùng bị từ chối', () => {
    expect(questionSkillsError(['kanji', 'kanji'], JP)).toBe(
      'Kỹ năng bị chọn trùng.',
    );
  });
  it('IT / ENG không có kỹ năng', () => {
    expect(questionSkillsError([], IT)).toBeNull();
    expect(questionSkillsError(['reading'], ENG)).toBe(
      'Hồ sơ ENG không có kỹ năng câu hỏi.',
    );
  });
});
