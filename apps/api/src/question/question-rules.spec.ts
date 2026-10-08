import { lmsProfileConfig } from '../lms-profile/lms-profile';
import { questionShapeError } from './question-rules';

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
