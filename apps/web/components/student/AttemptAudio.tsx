"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { Headphones, Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import type { AttemptAudioPlayDto, AttemptAudioView } from "@/dtos/attempt.dto";
import { audioPlaysLeft } from "@/lib/attempt-audio";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";
import QuestionAudio from "./QuestionAudio";

type PlayAudio = (audioId: string) => Promise<AttemptAudioPlayDto>;

const PlayAudioContext = createContext<PlayAudio | null>(null);

/** Trang làm bài cấp hàm "bấm phát" (gọi API, trừ lượt) cho mọi audio bên trong. */
export function AttemptAudioProvider({
  play,
  children,
}: {
  play: PlayAudio;
  children: ReactNode;
}) {
  return (
    <PlayAudioContext.Provider value={play}>
      {children}
    </PlayAudioContext.Provider>
  );
}

/**
 * Audio trong bài làm. Không giới hạn → trình phát thường. Có giới hạn → nút
 * phát tự làm: mỗi lần nghe từ đầu xin URL mới (server trừ lượt); tạm dừng rồi
 * nghe tiếp không tốn lượt. Không cho tua thì chỉ hiện thanh tiến độ.
 */
export default function AttemptAudio({
  audio,
  label = "Audio",
}: {
  audio: AttemptAudioView;
  label?: string;
}) {
  const play = useContext(PlayAudioContext);
  if (audio.maxPlays === null || !play) {
    return <QuestionAudio url={audio.url} label={label} />;
  }
  return <LimitedAudio audio={audio} label={label} play={play} />;
}

function LimitedAudio({
  audio,
  label,
  play,
}: {
  audio: AttemptAudioView;
  label: string;
  play: PlayAudio;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playsUsed, setPlaysUsed] = useState(audio.playsUsed);
  /** URL của lần nghe đang dở (null = chưa nghe / đã nghe hết lần trước). */
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });

  const left = audioPlaysLeft({ ...audio, playsUsed }) ?? 0;

  const start = useMutation({
    mutationFn: () => play(audio.id),
    onSuccess: (result) => {
      setPlaysUsed(result.playsUsed);
      if (!result.url) {
        toast.error("Không tải được audio — tải lại trang để thử lại.");
        return;
      }
      setSrc(result.url);
      // iOS có thể chặn play() sau await mạng: lượt đã trừ, URL giữ lại —
      // học sinh bấm lần nữa thì phát ngay, không tốn thêm lượt.
      requestAnimationFrame(() => {
        ref.current?.play().catch(() => setPlaying(false));
      });
    },
    onError: (error) =>
      toast.error(getMutationErrorMessage(error, "Không phát được audio.")),
  });

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (src) {
      if (el.paused) void el.play().catch(() => setPlaying(false));
      else el.pause();
      return;
    }
    if (left > 0) start.mutate();
  };

  const exhausted = !src && left === 0;
  const progress = time.duration ? (time.current / time.duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-2">
      <button
        type="button"
        onClick={toggle}
        disabled={exhausted || start.isPending}
        aria-label={playing ? `Tạm dừng ${label}` : `Nghe ${label}`}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-text-inverse disabled:bg-bg-secondary disabled:text-text-muted"
      >
        {start.isPending ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : playing ? (
          <Pause className="size-5" aria-hidden />
        ) : (
          <Play className="size-5" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        {audio.allowSeek && src ? (
          <input
            type="range"
            min={0}
            max={time.duration || 0}
            step={0.1}
            value={time.current}
            onChange={(e) => {
              if (ref.current) ref.current.currentTime = Number(e.target.value);
            }}
            aria-label={`Tua ${label}`}
            className="h-2 w-full accent-primary"
          />
        ) : (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Tiến độ ${label}`}
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="flex items-center gap-1 text-xs text-text-muted">
          <Headphones className="size-3.5 shrink-0" aria-hidden />
          {exhausted
            ? "Đã hết lượt nghe"
            : `Còn ${left}/${audio.maxPlays} lượt nghe${audio.allowSeek ? "" : " · không tua được"}`}
        </p>
      </div>
      <audio
        ref={ref}
        src={src ?? undefined}
        preload="auto"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setSrc(null);
          setTime({ current: 0, duration: 0 });
        }}
        onTimeUpdate={(e) =>
          setTime({
            current: e.currentTarget.currentTime,
            duration: e.currentTarget.duration || 0,
          })
        }
        className="hidden"
      />
    </div>
  );
}
