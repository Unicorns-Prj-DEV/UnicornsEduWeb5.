import type { UniojUsernameCheckResult } from "@/dtos/unioj-student-sync.dto";
import { api } from "../client";

/** Kiểm tra tên đăng nhập dùng được cho tài khoản UNIOJ (không giữ chỗ). */
export async function checkUniojUsername(
  username: string,
): Promise<UniojUsernameCheckResult> {
  const response = await api.get<UniojUsernameCheckResult>(
    "/unioj-student-sync/username-check",
    { params: { username } },
  );
  return response.data;
}
