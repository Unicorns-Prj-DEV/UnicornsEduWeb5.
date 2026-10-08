import { assignmentCloseAt, isAssignmentClosed } from './assignment-window';

describe('assignment window', () => {
  const openAt = new Date('2026-10-08T08:00:00.000Z');

  it('hạn = openAt + durationMinutes', () => {
    expect(assignmentCloseAt({ openAt, durationMinutes: 60 })).toEqual(
      new Date('2026-10-08T09:00:00.000Z'),
    );
  });

  it('không có openAt → không có hạn', () => {
    expect(assignmentCloseAt({ openAt: null, durationMinutes: 60 })).toBeNull();
    expect(isAssignmentClosed(null)).toBe(true);
  });

  it('đóng đúng từ mốc hạn trở đi', () => {
    const closeAt = new Date('2026-10-08T09:00:00.000Z');
    expect(isAssignmentClosed(closeAt, closeAt.getTime() - 1)).toBe(false);
    expect(isAssignmentClosed(closeAt, closeAt.getTime())).toBe(true);
  });
});
