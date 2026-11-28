"use client";

import type { useUniojUsernameCheck } from "@/lib/hooks/useUniojUsernameCheck";
import {
  UNIOJ_UNAVAILABLE_DESCRIPTION,
  UNIOJ_UNAVAILABLE_TITLE,
} from "@/lib/unioj-student-sync-error";

type Props = {
  check: ReturnType<typeof useUniojUsernameCheck>;
};

/** Dòng trạng thái dưới ô Tên đăng nhập: tên này tạo được tài khoản UNIOJ không (instance IT). */
export default function UniojUsernameHint({ check }: Props) {
  if (!check.syncEnabled) return null;

  if (check.isChecking) {
    return (
      <p className="text-xs text-text-muted" aria-live="polite">
        Đang kiểm tra với UNIOJ…
      </p>
    );
  }
  if (check.isError) {
    return (
      <p className="text-xs text-warning" aria-live="polite">
        {UNIOJ_UNAVAILABLE_TITLE}, chưa kiểm tra được tên đăng nhập.{" "}
        {UNIOJ_UNAVAILABLE_DESCRIPTION}
      </p>
    );
  }
  if (!check.result) {
    return (
      <p className="text-xs text-text-muted">
        Tên đăng nhập này cũng là tên đăng nhập UNIOJ, mật khẩu UNIOJ ban đầu trùng mật khẩu
        LMS.
      </p>
    );
  }
  if (check.result.available) {
    return (
      <p className="text-xs text-success" aria-live="polite">
        Tên dùng được cho tài khoản UNIOJ.
      </p>
    );
  }
  return (
    <p className="text-xs text-error" aria-live="polite">
      {check.result.message ?? "Tên đăng nhập không dùng được trên UNIOJ."}
    </p>
  );
}
