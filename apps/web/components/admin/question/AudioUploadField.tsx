"use client";

import { useRef, type ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import QuestionAudio from "@/components/student/QuestionAudio";
import { AUDIO_ACCEPT, type AudioRef } from "@/dtos/audio-asset.dto";
import { uploadAudio } from "@/lib/apis/audio-asset.api";
import { audioFileError } from "@/lib/audio-file";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";

/**
 * Chọn audio cho câu / tư liệu dùng chung (JP). Tải lên ngay khi chọn file;
 * giá trị form chỉ là tham chiếu — lưu câu/tư liệu mới gắn audio vào.
 */
export default function AudioUploadField({
  courseId,
  value,
  onChange,
  label = "Audio",
  hint,
}: {
  courseId: string;
  value: AudioRef | null;
  onChange: (next: AudioRef | null) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: (file: File) => uploadAudio(courseId, file),
    onSuccess: (audio) => {
      onChange(audio);
      toast.success("Đã tải audio lên.");
    },
    onError: (error) =>
      toast.error(getMutationErrorMessage(error, "Không thể tải audio lên.")),
  });

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const error = audioFileError(file);
    if (error) {
      toast.error(error);
      return;
    }
    upload.mutate(file);
  };

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-text-muted">{label}</span>
      {value ? (
        <div className="space-y-1.5 rounded-lg border border-border-default p-2">
          {value.url !== undefined ? (
            <QuestionAudio url={value.url} label={value.originalName} />
          ) : null}
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
              {value.originalName}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={upload.isPending}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50 sm:min-h-9"
            >
              <X className="size-4" aria-hidden />
              Gỡ audio
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!courseId || upload.isPending}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-primary hover:border-primary/50 disabled:opacity-50 sm:min-h-10"
      >
        {upload.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {upload.isPending
          ? "Đang tải lên..."
          : value
            ? "Thay audio"
            : "Tải audio lên"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        onChange={handleFile}
        className="hidden"
        aria-label={label}
      />
      <p className="text-xs text-text-muted">
        {hint ?? "MP3, M4A/AAC hoặc WAV, tối đa 20MB."}
      </p>
    </div>
  );
}
