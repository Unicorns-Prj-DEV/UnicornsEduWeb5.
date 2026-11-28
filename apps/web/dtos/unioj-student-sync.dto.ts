/** Lý do UNIOJ không nhận username. */
export type UniojUsernameUnavailableReason = "INVALID_FORMAT" | "TAKEN";

/** `GET /unioj-student-sync/username-check` (instance IT). */
export interface UniojUsernameCheckResult {
  /** `false` = instance không đồng bộ UNIOJ, bỏ qua kết quả. */
  enabled: boolean;
  username: string;
  available: boolean;
  reason: UniojUsernameUnavailableReason | null;
  message: string | null;
}

/** `code` trong body lỗi 503 khi hệ thống UNIOJ sập / LMS không gọi được UNIOJ. */
export const UNIOJ_UNAVAILABLE_ERROR_CODE = "UNIOJ_UNAVAILABLE";
