"use client";

import { Headphones } from "lucide-react";

/**
 * Trình phát audio tư liệu. `preload="none"` để không tải trước cả đề nghe trên
 * 4G; `playsInline` để iOS không bật toàn màn hình.
 */
export default function QuestionAudio({
  url,
  label = "Audio",
}: {
  url: string | null | undefined;
  label?: string;
}) {
  if (!url) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-warning">
        <Headphones className="size-4 shrink-0" aria-hidden />
        Không tải được audio — tải lại trang để thử lại.
      </p>
    );
  }
  return (
    <audio
      controls
      preload="none"
      playsInline
      src={url}
      aria-label={label}
      className="h-11 w-full"
    />
  );
}
