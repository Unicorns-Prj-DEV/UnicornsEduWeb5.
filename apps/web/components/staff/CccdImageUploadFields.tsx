"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type Props = {
  frontImage: File | null;
  backImage: File | null;
  frontPath?: string | null;
  backPath?: string | null;
  frontUrl?: string | null;
  backUrl?: string | null;
  disabled?: boolean;
  isUploading?: boolean;
  onFrontImageChange: (file: File | null) => void;
  onBackImageChange: (file: File | null) => void;
};

type PreviewDialogState = {
  label: string;
  src: string;
} | null;

function buildStoredImageMessage(
  path?: string | null,
  url?: string | null,
  fallbackLabel?: string,
) {
  if (url) {
    return fallbackLabel ?? "Đã có ảnh xác minh.";
  }

  if (path) {
    return "Đã lưu ảnh nhưng chưa tạo được link xem.";
  }

  return "Chưa có ảnh xác minh.";
}

export default function CccdImageUploadFields({
  frontImage,
  backImage,
  frontPath,
  backPath,
  frontUrl,
  backUrl,
  disabled = false,
  isUploading = false,
  onFrontImageChange,
  onBackImageChange,
}: Props) {
  const [dialogPreview, setDialogPreview] = useState<PreviewDialogState>(null);

  const frontPreviewUrl = useMemo(() => {
    if (!frontImage) return null;
    return URL.createObjectURL(frontImage);
  }, [frontImage]);

  useEffect(() => {
    return () => {
      if (frontPreviewUrl) {
        URL.revokeObjectURL(frontPreviewUrl);
      }
    };
  }, [frontPreviewUrl]);

  const backPreviewUrl = useMemo(() => {
    if (!backImage) return null;
    return URL.createObjectURL(backImage);
  }, [backImage]);

  useEffect(() => {
    return () => {
      if (backPreviewUrl) {
        URL.revokeObjectURL(backPreviewUrl);
      }
    };
  }, [backPreviewUrl]);

  const handleFileChange =
    (onChange: (file: File | null) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.files?.[0] ?? null);
    };

  const renderPreviewCard = ({
    label,
    image,
    storedPath,
    storedUrl,
    previewUrl,
    onChange,
  }: {
    label: string;
    image: File | null;
    storedPath?: string | null;
    storedUrl?: string | null;
    previewUrl?: string | null;
    onChange: (file: File | null) => void;
  }) => {
    const currentUrl = previewUrl ?? storedUrl ?? null;
    const hasPreview = Boolean(currentUrl);
    const statusText = image
      ? `Đã chọn: ${image.name}`
      : buildStoredImageMessage(
          storedPath,
          storedUrl,
          `Đã có ảnh ${label.toLowerCase()}.`,
        );

    return (
      <div className="rounded-[1rem] border border-border-default bg-bg-surface/90 p-3 shadow-sm">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          <span className="font-medium text-text-primary">{label}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled || isUploading}
            onChange={handleFileChange(onChange)}
            className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          />
        </label>

        <div className="mt-3 overflow-hidden rounded-[0.95rem] border border-border-default bg-bg-secondary/30">
          <button
            type="button"
            disabled={!hasPreview}
            onClick={() => {
              if (!currentUrl) return;
              setDialogPreview({ label, src: currentUrl });
            }}
            className="block w-full text-left disabled:cursor-default"
          >
            <div className="relative aspect-[1.55] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_48%),linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.01))]">
              {currentUrl ? (
                <Image
                  src={currentUrl}
                  alt={label}
                  fill
                  unoptimized
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-text-muted">
                  Chưa có ảnh để xem trước.
                </div>
              )}

              {currentUrl ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85">
                    {image ? "Preview mới chọn" : "Ảnh đã lưu"}
                  </p>
                </div>
              ) : null}
            </div>
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <p className="text-xs text-text-muted">{statusText}</p>
            {currentUrl ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDialogPreview({ label, src: currentUrl })}
                  className="rounded-lg border border-border-default px-2.5 py-1 text-[11px] font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Xem ảnh
                </button>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Mở tab
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="rounded-[1.15rem] border border-border-default bg-bg-secondary/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Ảnh CCCD xác minh</p>
            <p className="mt-1 text-xs text-text-muted">
              Upload 2 mặt CCCD để đối chiếu với số đã nhập và có thể xem lại trực tiếp ngay trong form.
            </p>
          </div>
          <div className="rounded-full border border-border-default bg-bg-surface px-2.5 py-1 text-[11px] font-medium text-text-muted">
            JPEG, PNG, WEBP • tối đa 5MB
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {renderPreviewCard({
            label: "Mặt trước",
            image: frontImage,
            storedPath: frontPath,
            storedUrl: frontUrl,
            previewUrl: frontPreviewUrl,
            onChange: onFrontImageChange,
          })}
          {renderPreviewCard({
            label: "Mặt sau",
            image: backImage,
            storedPath: backPath,
            storedUrl: backUrl,
            previewUrl: backPreviewUrl,
            onChange: onBackImageChange,
          })}
        </div>
      </div>

      {dialogPreview ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Xem ${dialogPreview.label}`}
          onClick={() => setDialogPreview(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setDialogPreview(null);
          }}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950 shadow-2xl"
            role="presentation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">
                  CCCD Preview
                </p>
                <h3 className="mt-1 text-sm font-semibold">{dialogPreview.label}</h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={dialogPreview.src}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  Mở tab mới
                </a>
                <button
                  type="button"
                  onClick={() => setDialogPreview(null)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] overflow-auto bg-[linear-gradient(180deg,#020617,#111827)] p-3">
              <Image
                src={dialogPreview.src}
                alt={dialogPreview.label}
                width={1600}
                height={1200}
                unoptimized
                className="mx-auto h-auto max-w-full rounded-[1rem] border border-white/10 bg-white object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
