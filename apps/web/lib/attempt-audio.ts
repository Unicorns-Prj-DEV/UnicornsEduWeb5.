import type { AttemptAudioView } from "@/dtos/attempt.dto";

/** Số lượt nghe còn lại; null = không giới hạn. */
export function audioPlaysLeft(audio: AttemptAudioView): number | null {
  if (audio.maxPlays === null) return null;
  return Math.max(0, audio.maxPlays - audio.playsUsed);
}

/** Audio chỉ có URL (ôn nhẹ, xem trước khi soạn): không giới hạn, cho tua. */
export function openAudio(
  url: string | null | undefined,
): AttemptAudioView | null {
  if (!url) return null;
  return { id: url, url, maxPlays: null, allowSeek: true, playsUsed: 0 };
}

/**
 * Trình phát gốc (`<audio controls>`) luôn có thanh tua — chỉ dùng khi audio
 * vừa không giới hạn lượt vừa cho tua. Còn lại dùng trình phát riêng.
 */
export function needsRestrictedPlayer(audio: AttemptAudioView): boolean {
  return audio.maxPlays !== null || !audio.allowSeek;
}
