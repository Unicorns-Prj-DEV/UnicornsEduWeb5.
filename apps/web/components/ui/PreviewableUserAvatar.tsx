"use client";

import { useState } from "react";
import AvatarLightbox from "@/components/ui/AvatarLightbox";
import UserAvatar from "@/components/ui/UserAvatar";

type PreviewableUserAvatarProps = {
  src?: string | null;
  fallback: string;
  alt: string;
  displayName?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  buttonClassName?: string;
  previewLabel?: string;
};

export default function PreviewableUserAvatar({
  src,
  fallback,
  alt,
  displayName,
  className,
  imageClassName,
  fallbackClassName,
  buttonClassName,
  previewLabel,
}: PreviewableUserAvatarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex shrink-0 rounded-full transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${buttonClassName ?? ""}`}
        aria-label={previewLabel ?? `Xem ảnh đại diện của ${displayName?.trim() || alt}`}
      >
        <UserAvatar
          src={src}
          fallback={fallback}
          alt={alt}
          className={className}
          imageClassName={imageClassName}
          fallbackClassName={fallbackClassName}
        />
      </button>

      <AvatarLightbox
        open={open}
        onClose={() => setOpen(false)}
        src={src}
        fallback={fallback}
        alt={alt}
        displayName={displayName}
      />
    </>
  );
}
