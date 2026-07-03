"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  downloadAvatarWithToast,
  suggestAvatarFilename,
} from "@/lib/avatar";

type AvatarLightboxProps = {
  open: boolean;
  onClose: () => void;
  src?: string | null;
  fallback: string;
  alt: string;
  displayName?: string;
};

export default function AvatarLightbox({
  open,
  onClose,
  src,
  fallback,
  alt,
  displayName,
}: AvatarLightboxProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const resolvedSrc = src?.trim() || null;
  const canDownload = Boolean(resolvedSrc);
  const title = displayName?.trim() || alt;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const handleDownload = async () => {
    if (!resolvedSrc || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadAvatarWithToast(
        resolvedSrc,
        suggestAvatarFilename(title, resolvedSrc),
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[80] cursor-pointer bg-bg-primary/75"
        aria-label="Đóng xem ảnh đại diện"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-lightbox-title"
          className="pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border-default px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2
                id="avatar-lightbox-title"
                className="truncate text-base font-semibold text-text-primary"
              >
                Ảnh đại diện
              </h2>
              <p className="mt-0.5 truncate text-sm text-text-muted">{title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-default bg-bg-secondary text-text-muted transition-colors hover:bg-bg-primary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:cursor-pointer"
              aria-label="Đóng"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center bg-bg-secondary/40 px-4 py-6 sm:px-6 sm:py-8">
            {resolvedSrc ? (
              <div className="relative size-[min(72vw,20rem)] max-h-[min(60dvh,20rem)] sm:size-80">
                <Image
                  src={resolvedSrc}
                  alt={alt}
                  fill
                  sizes="(max-width: 640px) 72vw, 20rem"
                  unoptimized
                  className="rounded-full object-cover ring-2 ring-border-default"
                  priority
                />
              </div>
            ) : (
              <UserAvatar
                src={null}
                fallback={fallback}
                alt={alt}
                className="size-[min(72vw,20rem)] max-h-[min(60dvh,20rem)] bg-bg-tertiary text-5xl font-semibold text-text-primary ring-2 ring-border-default sm:size-80 sm:text-6xl"
                fallbackClassName="text-5xl font-semibold text-text-primary sm:text-6xl"
              />
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border-default px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:cursor-pointer"
            >
              Đóng
            </button>
            {canDownload ? (
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  className="size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                  />
                </svg>
                {isDownloading ? "Đang tải…" : "Tải ảnh"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
