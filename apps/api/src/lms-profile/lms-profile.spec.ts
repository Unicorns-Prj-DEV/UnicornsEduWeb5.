import { loadLmsProfile } from './lms-profile';

describe('loadLmsProfile', () => {
  it.each(['it', 'jp', 'eng', ' IT '])('chấp nhận %p', (value) => {
    expect(loadLmsProfile({ LMS_PROFILE: value }).profile).toBe(
      value.trim().toLowerCase(),
    );
  });

  it.each([undefined, '', 'math', 'legacy'])('từ chối %p', (value) => {
    expect(() => loadLmsProfile({ LMS_PROFILE: value })).toThrow(
      /LMS_PROFILE/,
    );
  });

  it('IT chấm điểm tuyệt đối, không có tự luận', () => {
    const it = loadLmsProfile({ LMS_PROFILE: 'it' });
    expect(it.scoring).toBe('absolute_it');
    expect(it.questionTypes).not.toContain('essay');
    expect(it.questionTypes).toContain('true_false_group');
  });

  it('JP giữ 100/N và tự luận', () => {
    const jp = loadLmsProfile({ LMS_PROFILE: 'jp' });
    expect(jp.scoring).toBe('equal_100');
    expect(jp.questionTypes).toContain('essay');
  });
});
