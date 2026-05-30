"use client";

import { BellIcon } from "@heroicons/react/24/outline";

export function SidebarNotificationBellButton({
  unreadCount,
  onClick,
  compact = false,
}: {
  unreadCount: number;
  onClick: () => void;
  /** Collapsed desktop sidebar: slightly tighter hit target */
  compact?: boolean;
}) {
  const label =
    unreadCount > 0
      ? `Thông báo, ${unreadCount} chưa đọc`
      : "Thông báo";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${compact ? "size-10 md:size-9" : "size-11 md:size-10"}`}
      aria-label={label}
      title={label}
    >
      <BellIcon className={compact ? "size-[1.15rem]" : "size-5"} strokeWidth={1.75} aria-hidden />
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-text-inverse ring-2 ring-bg-secondary">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
