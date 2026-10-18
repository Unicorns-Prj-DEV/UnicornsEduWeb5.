type AssignmentDurationSource = {
  durationMinutes: number | null;
  lesson?: { durationMinutes: number | null } | null;
};

/**
 * Thời lượng làm bài (phút/lượt) hiệu lực của lần giao: lần giao cũ giữ thời
 * lượng đã chốt; lần giao mới đọc từ tiết thực hành (sửa tiết áp cho mọi lớp).
 */
export function assignmentDurationMinutes(
  item: AssignmentDurationSource,
): number | null {
  return item.durationMinutes ?? item.lesson?.durationMinutes ?? null;
}

/**
 * Hạn của lần giao = thời điểm mở bài + thời lượng. Trước hạn, học sinh đã nộp
 * chưa được xem điểm/đáp án (bạn cùng lớp có thể chưa làm); từ hạn trở đi lần
 * giao đóng: không bắt đầu lượt mới, kết quả được công bố.
 *
 * Lần giao cũ không có `openAt` → không có hạn: xem kết quả ngay, không khoá.
 */
export function assignmentCloseAt(
  item: AssignmentDurationSource & { openAt: Date | null },
): Date | null {
  const durationMinutes = assignmentDurationMinutes(item);
  if (!item.openAt || durationMinutes == null) return null;
  return new Date(item.openAt.getTime() + durationMinutes * 60_000);
}

/** Đã tới hạn (hoặc không có hạn) → công bố điểm/đáp án, khoá lượt mới. */
export function isAssignmentClosed(
  closeAt: Date | null,
  now: number = Date.now(),
): boolean {
  return closeAt == null || now >= closeAt.getTime();
}
