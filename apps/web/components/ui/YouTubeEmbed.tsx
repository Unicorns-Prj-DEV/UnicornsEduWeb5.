"use client";

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  useId,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  Check,
  Settings,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type YouTubeEmbedProps = {
  url: string;
  protected?: boolean;
  className?: string;
  title?: string;
};

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Global script loader for YouTube IFrame API
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as unknown as { YT?: { Player?: unknown } }).YT?.Player) {
    return Promise.resolve();
  }

  if (!ytApiPromise) {
    ytApiPromise = new Promise<void>((resolve) => {
      const existing = document.getElementById("youtube-iframe-api");
      if (!existing) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }

      const prevReady = (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady;
      (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === "function") {
          prevReady();
        }
        resolve();
      };

      const checkInterval = setInterval(() => {
        if ((window as unknown as { YT?: { Player?: unknown } }).YT?.Player) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  return ytApiPromise;
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoLoadedFraction: () => number;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setPlaybackRate: (rate: number) => void;
  getPlaybackRate: () => number;
  destroy: () => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export default function YouTubeEmbed({
  url,
  protected: isProtected = true,
  className = "w-full aspect-video",
  title = "Video bài học",
}: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const videoId = useMemo(() => extractYouTubeVideoId(url), [url]);
  const rawId = useId();
  const playerId = useMemo(
    () => `yt-player-${rawId.replace(/[^a-zA-Z0-9_-]/g, "") || "player"}`,
    [rawId],
  );

  const [isApiReady, setIsApiReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadedFraction, setLoadedFraction] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isHoveringProgressBar, setIsHoveringProgressBar] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const posterUrl = useMemo(() => {
    if (!videoId) return "";
    return thumbnailError
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }, [videoId, thumbnailError]);

  // DevTools detection & key shortcut blocker
  useEffect(() => {
    if (!isProtected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = e.key.toLowerCase();

      // Ctrl/Cmd + Shift + I/J/C (Devtools)
      if (isCmdOrCtrl && isShift && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + U (View Source), Ctrl/Cmd + S (Save page)
      if (isCmdOrCtrl && (key === "u" || key === "s")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Cmd + Option + I/J/C/U on Mac
      if (isCmdOrCtrl && isAlt && (key === "i" || key === "j" || key === "c" || key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        setIsDevToolsOpen(true);
      } else {
        setIsDevToolsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("resize", checkDevTools);
    const interval = setInterval(checkDevTools, 2000);

    const container = containerRef.current;
    if (container) {
      container.addEventListener("contextmenu", handleContextMenu);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("resize", checkDevTools);
      clearInterval(interval);
      if (container) {
        container.removeEventListener("contextmenu", handleContextMenu);
      }
    };
  }, [isProtected]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Initialize YouTube Iframe Player
  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;

    loadYouTubeIframeApi().then(() => {
      if (!isMounted) return;

      setHasStarted(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setThumbnailError(false);

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }

      const YT = (window as unknown as {
        YT: {
          Player: new (
            id: string,
            config: {
              host?: string;
              videoId: string;
              playerVars: Record<string, unknown>;
              events: {
                onReady?: (event: { target: YTPlayerInstance }) => void;
                onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
                onPlaybackRateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
                onError?: (event: unknown) => void;
              };
            },
          ) => YTPlayerInstance;
        };
      }).YT;

      playerRef.current = new YT.Player(playerId, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0, // Hide all native YouTube controls and links!
          disablekb: 1, // Disable keyboard shortcuts in iframe
          enablejsapi: 1,
          fs: 0, // Hide YouTube native fullscreen
          iv_load_policy: 3, // Hide video annotations
          modestbranding: 1,
          playsinline: 1,
          rel: 0, // Avoid external related videos
          cc_load_policy: 0, // Default subtitle off
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
          widget_referrer: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (event) => {
            if (!isMounted) return;
            const iframe = document.getElementById(playerId) as HTMLIFrameElement | null;
            if (iframe) {
              iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
              iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
              iframe.setAttribute(
                "allow",
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
              );
            }
            setIsApiReady(true);
            setDuration(event.target.getDuration() || 0);
            setVolume(event.target.getVolume() || 100);
            setIsMuted(event.target.isMuted() || false);
          },
          onStateChange: (event) => {
            if (!isMounted) return;
            const state = event.data;
            // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED
            setIsPlaying(state === 1);
            setIsBuffering(state === 3);
            if (state === 0) {
              setIsPlaying(false);
              setHasStarted(false);
            }
            if (playerRef.current) {
              setDuration(playerRef.current.getDuration() || 0);
            }
          },
          onPlaybackRateChange: (event: { data: number; target: YTPlayerInstance }) => {
            if (!isMounted) return;
            if (typeof event.data === "number") {
              setPlaybackSpeed(event.data);
            }
          },
          onError: () => {
            if (!isMounted) return;
            setHasError(true);
          },
        },
      });
    });

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId, playerId]);

  // Poll video progress when playing
  useEffect(() => {
    if (!isPlaying || !playerRef.current) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        if (typeof playerRef.current.getVideoLoadedFraction === "function") {
          setLoadedFraction(playerRef.current.getVideoLoadedFraction() || 0);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Auto hide controls when idle during playback
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying && !isSettingsOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isSettingsOpen]);

  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const togglePlayPause = useCallback(() => {
    if (!hasStarted) {
      setHasStarted(true);
    }
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    resetControlsTimeout();
  }, [hasStarted, isPlaying, resetControlsTimeout]);

  const handleSeek = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!hasStarted) {
        setHasStarted(true);
      }
      if (!progressBarRef.current || !playerRef.current || duration <= 0) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, clickX / rect.width));
      const targetTime = fraction * duration;
      playerRef.current.seekTo(targetTime, true);
      setCurrentTime(targetTime);
      resetControlsTimeout();
    },
    [duration, hasStarted, resetControlsTimeout],
  );

  const handleProgressBarMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!progressBarRef.current || duration <= 0) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, clickX / rect.width));
      setHoverPosition(clickX);
      setHoverTime(fraction * duration);
    },
    [duration],
  );

  const skipSeconds = useCallback(
    (seconds: number) => {
      if (!playerRef.current || duration <= 0) return;
      const target = Math.max(0, Math.min(duration, currentTime + seconds));
      playerRef.current.seekTo(target, true);
      setCurrentTime(target);
      resetControlsTimeout();
    },
    [currentTime, duration, resetControlsTimeout],
  );

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!playerRef.current) return;
    playerRef.current.setVolume(newVolume);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  const changePlaybackSpeed = useCallback((speed: number) => {
    if (!playerRef.current) return;
    playerRef.current.setPlaybackRate(speed);
    setPlaybackSpeed(speed);
    setIsSettingsOpen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {
        // Fullscreen request may be blocked in some contexts
      });
    } else {
      document.exitFullscreen?.().catch(() => {
        // Exit fullscreen fallback
      });
    }
  }, []);

  const handlePreventContextMenu = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlayPause();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          skipSeconds(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          skipSeconds(10);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(Math.min(100, volume + 5));
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 5));
          break;
      }
    },
    [togglePlayPause, skipSeconds, toggleMute, toggleFullscreen, handleVolumeChange, volume],
  );

  if (!videoId || hasError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default bg-bg-secondary/40 text-xs text-text-muted p-6 text-center",
          className,
        )}
      >
        <svg className="size-8 text-text-muted/60 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>{hasError ? "Không thể tải video bài giảng." : "Link video không hợp lệ hoặc chưa được cập nhật."}</span>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loadedPercent = loadedFraction * 100;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onContextMenu={handlePreventContextMenu}
      className={cn(
        "group relative overflow-hidden bg-black select-none outline-none transition-all flex items-center justify-center",
        isFullscreen
          ? "fixed inset-0 z-50 h-screen w-screen rounded-none"
          : "rounded-xl shadow-md",
        !showControls && isPlaying ? "cursor-none" : "cursor-default",
        className,
      )}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      aria-label={title}
    >
      {/* 16:9 Video Canvas - centered with letterboxing */}
      <div className="relative w-full aspect-video max-w-full max-h-full flex items-center justify-center overflow-hidden">
        {/* Underlying YouTube iframe */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div id={playerId} className="w-full h-full pointer-events-none" />
        </div>

        {/* Clean Custom Poster Cover */}
        {!hasStarted && (
          <div
            onClick={togglePlayPause}
            className="absolute inset-0 z-12 flex items-center justify-center bg-black cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt={title}
              onError={() => setThumbnailError(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 transition-opacity hover:bg-black/15" />
            <div className="relative z-10 flex size-16 sm:size-20 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md shadow-2xl transition-transform hover:scale-110 active:scale-95 border border-white/25">
              <Play className="size-8 sm:size-10 fill-white translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Transparent click shield covering the full video canvas */}
        <div
          className="absolute inset-0 z-10 bg-transparent cursor-pointer"
          onClick={togglePlayPause}
          onDoubleClick={toggleFullscreen}
          onContextMenu={handlePreventContextMenu}
          title=""
          aria-hidden="true"
        />

        {/* Center Buffering Spinner */}
        {isBuffering && (
          <div className="pointer-events-none absolute inset-0 z-15 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <Loader2 className="size-12 text-primary animate-spin" />
          </div>
        )}

        {/* Center Play Button when paused */}
        {hasStarted && !isPlaying && isApiReady && !isBuffering && (
          <div
            onClick={togglePlayPause}
            className="absolute inset-0 z-15 flex items-center justify-center cursor-pointer"
          >
            <div className="flex size-16 sm:size-20 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md shadow-2xl transition-transform hover:scale-110 active:scale-95 border border-white/20">
              <Play className="size-8 sm:size-10 fill-white translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Top Gradient Overlay */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/70 to-transparent z-20 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="p-4">
          <p className="text-xs sm:text-sm font-medium text-white/90 truncate drop-shadow-md">
            {title}
          </p>
        </div>
      </div>

      {/* Bottom Custom Control Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-25 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 sm:px-5 pb-3 pt-8 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar / Scrubber */}
        <div
          ref={progressBarRef}
          onClick={handleSeek}
          onMouseMove={handleProgressBarMouseMove}
          onMouseEnter={() => setIsHoveringProgressBar(true)}
          onMouseLeave={() => setIsHoveringProgressBar(false)}
          className="group/track relative mb-3 flex h-3 w-full cursor-pointer items-center"
        >
          {/* Background track */}
          <div className="h-1 w-full rounded-full bg-white/25 transition-all group-hover/track:h-2">
            {/* Loaded/Buffered bar */}
            <div
              className="h-full rounded-full bg-white/40 transition-all duration-150"
              style={{ width: `${loadedPercent}%` }}
            />
          </div>

          {/* Played bar */}
          <div
            className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary transition-all group-hover/track:h-2"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Scrubber thumb */}
          <div
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform scale-0 group-hover/track:scale-100 border border-black/20"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Hover timestamp tooltip */}
          {isHoveringProgressBar && hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[10px] font-mono text-white shadow-md pointer-events-none border border-white/10"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Buttons and Time */}
        <div className="flex items-center justify-between gap-2 text-white">
          {/* Left: Play/Pause, Skip 10s, Volume, Time */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={togglePlayPause}
              className="flex size-8 sm:size-9 items-center justify-center rounded-lg hover:bg-white/20 transition-colors focus:outline-none"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? (
                <Pause className="size-5 fill-white" />
              ) : (
                <Play className="size-5 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(-10)}
              className="flex size-8 sm:size-9 items-center justify-center rounded-lg hover:bg-white/20 transition-colors focus:outline-none"
              title="Lùi 10 giây (j)"
              aria-label="Lùi 10 giây"
            >
              <RotateCcw className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(10)}
              className="flex size-8 sm:size-9 items-center justify-center rounded-lg hover:bg-white/20 transition-colors focus:outline-none"
              title="Tua 10 giây (l)"
              aria-label="Tua 10 giây"
            >
              <RotateCw className="size-4" />
            </button>

            {/* Volume control with hover slider */}
            <div className="group/vol relative flex items-center">
              <button
                type="button"
                onClick={toggleMute}
                className="flex size-8 sm:size-9 items-center justify-center rounded-lg hover:bg-white/20 transition-colors focus:outline-none"
                aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                title={isMuted ? "Bật âm thanh (m)" : "Tắt âm thanh (m)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="size-5" />
                ) : volume < 50 ? (
                  <Volume1 className="size-5" />
                ) : (
                  <Volume2 className="size-5" />
                )}
              </button>

              <div className="hidden sm:flex items-center w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-200 pl-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-primary bg-white/30 rounded-lg"
                  aria-label="Âm lượng"
                />
              </div>
            </div>

            {/* Time display */}
            <div className="text-[11px] sm:text-xs font-mono text-white/80 select-none pl-1">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-white/40">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Settings (Speed), Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Settings Popover Menu */}
            <div ref={settingsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={cn(
                  "flex size-8 sm:size-9 items-center justify-center rounded-lg transition-colors hover:bg-white/20 focus:outline-none",
                  isSettingsOpen && "bg-white/20 text-primary",
                )}
                aria-label="Tốc độ phát"
                title={`Tốc độ phát (${playbackSpeed}x)`}
              >
                <Settings className="size-4 sm:size-4.5" />
              </button>

              {isSettingsOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl border border-white/15 bg-neutral-900/95 p-2 shadow-2xl backdrop-blur-md z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10 mb-1">
                    <Gauge className="size-3.5 text-white/70" />
                    <span>Tốc độ phát</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => changePlaybackSpeed(speed)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/10 transition-colors",
                          playbackSpeed === speed && "text-primary font-bold bg-white/10",
                        )}
                      >
                        <span>{speed === 1 ? "1x (Chuẩn)" : `${speed}x`}</span>
                        {playbackSpeed === speed && <Check className="size-3.5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex size-8 sm:size-9 items-center justify-center rounded-lg hover:bg-white/20 transition-colors focus:outline-none"
              aria-label={isFullscreen ? "Thoát toàn màn hình (f)" : "Toàn màn hình (f)"}
              title={isFullscreen ? "Thoát toàn màn hình (f)" : "Toàn màn hình (f)"}
            >
              {isFullscreen ? (
                <Minimize className="size-4 sm:size-5" />
              ) : (
                <Maximize className="size-4 sm:size-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DevTools detected warning overlay */}
      {isProtected && isDevToolsOpen && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-bg-primary/95 p-6 text-center backdrop-blur-md">
          <div className="size-12 rounded-full bg-warning/10 text-warning flex items-center justify-center mb-3">
            <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-primary">
            Nội dung bài học được bảo vệ bản quyền
          </p>
          <p className="mt-1 text-xs text-text-muted max-w-sm">
            Vui lòng đóng công cụ kiểm tra (Developer Tools) để tiếp tục xem video bài giảng.
          </p>
        </div>
      )}
    </div>
  );
}
