"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResponsiveDialogSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "full";

type ResponsiveDialogProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  labelledBy?: string;
  describedBy?: string;
  onBackdropClick?: () => void;
  size?: ResponsiveDialogSize;
};

const sizeClasses: Record<ResponsiveDialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  "6xl": "sm:max-w-6xl",
  "7xl": "sm:max-w-7xl",
  full: "sm:max-w-[96vw] max-w-[1600px]",
};

export function ResponsiveDialog({
  children,
  className,
  contentClassName,
  labelledBy,
  describedBy,
  onBackdropClick,
  size = "md",
}: ResponsiveDialogProps) {
  const resolvedSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      <button
        type="button"
        className="absolute inset-0 bg-bg-primary/70"
        aria-label="Đóng"
        onClick={onBackdropClick}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-border-default bg-bg-surface shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl",
          resolvedSizeClass,
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}

type ResponsiveDialogBodyProps = {
  children: ReactNode;
  className?: string;
};

export function ResponsiveDialogBody({
  children,
  className,
}: ResponsiveDialogBodyProps) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}

type ResponsiveActionFooterProps = {
  children: ReactNode;
  className?: string;
};

export function ResponsiveActionFooter({
  children,
  className,
}: ResponsiveActionFooterProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 border-t border-border-subtle bg-bg-surface p-4 min-[380px]:grid-cols-2 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
