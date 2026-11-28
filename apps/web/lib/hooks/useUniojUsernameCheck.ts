"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkUniojUsername } from "@/lib/apis/unioj-student-sync.api";
import { useAppConfig } from "@/lib/hooks/useAppConfig";
import { uniojStudentSyncKeys } from "@/lib/query-keys";

const DEBOUNCE_MS = 400;
const MIN_LENGTH = 3;

/**
 * Instance IT: kiểm tra tên đăng nhập với UNIOJ khi người dùng ngừng gõ.
 * Instance khác không gọi gì (`enabled: false`).
 */
export function useUniojUsernameCheck(rawHandle: string) {
  const { data: appConfig } = useAppConfig();
  const syncEnabled = appConfig?.profile === "it";
  const handle = rawHandle.trim();
  const [debounced, setDebounced] = useState(handle);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(handle), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [handle]);

  const query = useQuery({
    queryKey: uniojStudentSyncKeys.usernameCheck(debounced),
    queryFn: () => checkUniojUsername(debounced),
    enabled: syncEnabled && debounced.length >= MIN_LENGTH,
    staleTime: 30_000,
    retry: false,
  });

  const settled = debounced === handle;
  return {
    syncEnabled,
    /** Đang chờ người dùng ngừng gõ hoặc đang hỏi UNIOJ. */
    isChecking: syncEnabled && handle.length >= MIN_LENGTH && (!settled || query.isFetching),
    /** Kết quả cho đúng giá trị đang nhập; `undefined` khi chưa có. */
    result: settled && query.data?.enabled ? query.data : undefined,
    isError: settled && query.isError,
  };
}
