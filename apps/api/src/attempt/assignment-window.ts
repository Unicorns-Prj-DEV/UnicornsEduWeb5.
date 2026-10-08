/**
 * Hạn của lần giao = thời điểm mở bài + thời lượng. Trước hạn, học sinh đã nộp
 * chưa được xem điểm/đáp án (bạn cùng lớp có thể chưa làm); từ hạn trở đi lần
 * giao đóng: không bắt đầu lượt mới, kết quả được công bố.
 *
 * Lần giao cũ không có `openAt` → không có hạn: xem kết quả ngay, không khoá.
 */
export function assignmentCloseAt(item: {
  openAt: Date | null;
  durationMinutes: number | null;
}): Date | null {
  if (!item.openAt || item.durationMinutes == null) return null;
  return new Date(item.openAt.getTime() + item.durationMinutes * 60_000);
}

/** Đã tới hạn (hoặc không có hạn) → công bố điểm/đáp án, khoá lượt mới. */
export function isAssignmentClosed(
  closeAt: Date | null,
  now: number = Date.now(),
): boolean {
  return closeAt == null || now >= closeAt.getTime();
}
