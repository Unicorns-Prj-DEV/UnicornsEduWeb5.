import { toast } from "sonner";
import { UNIOJ_UNAVAILABLE_ERROR_CODE } from "@/dtos/unioj-student-sync.dto";

/** Lỗi API do hệ thống UNIOJ sập / không gọi được (backend trả `code: UNIOJ_UNAVAILABLE`). */
export function isUniojUnavailableError(error: unknown): boolean {
  const data = (error as { response?: { data?: { code?: unknown } } })?.response?.data;
  return data?.code === UNIOJ_UNAVAILABLE_ERROR_CODE;
}

export const UNIOJ_UNAVAILABLE_TITLE = "Hệ thống OJ đang lỗi";
export const UNIOJ_UNAVAILABLE_DESCRIPTION =
  "Vui lòng báo cáo với kỹ thuật viên.";

/** Toast khi tạo học sinh thất bại vì UNIOJ sập: học sinh chưa được tạo. */
export function toastUniojUnavailable() {
  toast.error(UNIOJ_UNAVAILABLE_TITLE, {
    description: `Chưa tạo được học sinh. ${UNIOJ_UNAVAILABLE_DESCRIPTION}`,
    duration: 10_000,
  });
}
