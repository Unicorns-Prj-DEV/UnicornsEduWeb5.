/**
 * Mock trạng thái xác minh email cho UI `/user-profile` khi BE chưa trả
 * `emailVerified` hoặc cần cố định demo (đổi giá trị dưới đây để xem icon).
 *
 * Quy tắc: nếu `GET /users/me/full` trả `emailVerified: boolean`, luôn dùng giá trị API.
 */
export const USER_PROFILE_VERIFICATION_MOCK = {
  /**
   * `true` = luôn hiển thị **chưa xác minh** (kể cả khi API trả `emailVerified: true`) — chỉ bật tạm khi test UI.
   * Mặc định `false` để `/user-profile` phản ánh đúng `GET /users/me/full`.
   */
  forceEmailUnverifiedForTest: false,
  /**
   * Khi API không gửi `emailVerified` và `forceEmailUnverifiedForTest` là `false`:
   * `false` → chưa xác minh; `true` → đã xác minh.
   */
  emailVerifiedWhenApiMissing: false,
  /** Trễ giả lập gọi gửi email (ms). */
  verifyEmailRequestMinDelayMs: 400,
} as const;

/** Toast copy khi bấm «Xác minh email» (chưa wire API thật). */
export const MOCK_VERIFY_EMAIL_TOAST = {
  success: "Đã gửi liên kết xác minh tới email (demo). Vui lòng kiểm tra hộp thư.",
} as const;

/** Giả lập gọi API gửi lại email xác minh — thay bằng `authApi.resendVerificationEmail()` khi có endpoint. */
export function mockResendVerificationEmail(): Promise<void> {
  const ms = USER_PROFILE_VERIFICATION_MOCK.verifyEmailRequestMinDelayMs;
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function resolveEmailVerified(
  apiValue: boolean | undefined | null,
): boolean {
  if (USER_PROFILE_VERIFICATION_MOCK.forceEmailUnverifiedForTest) {
    return false;
  }
  if (typeof apiValue === "boolean") {
    return apiValue;
  }
  return USER_PROFILE_VERIFICATION_MOCK.emailVerifiedWhenApiMissing;
}

/**
 * Email học viên: chỉ hiển thị đã xác minh khi trùng email tài khoản và tài khoản được xác minh.
 */
export function resolveStudentEmailVerified(
  accountEmail: string | undefined | null,
  studentEmail: string | undefined | null,
  apiEmailVerified: boolean | undefined | null,
): boolean {
  const a = accountEmail?.trim().toLowerCase() ?? "";
  const s = studentEmail?.trim().toLowerCase() ?? "";
  if (!s) return false;
  if (a && s === a) return resolveEmailVerified(apiEmailVerified);
  return false;
}
