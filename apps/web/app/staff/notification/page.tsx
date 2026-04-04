"use client";

import { useQuery } from "@tanstack/react-query";
import type { NotificationFeedItem } from "@/dtos/notification.dto";
import { formatDateTime } from "@/lib/class.helpers";
import * as notificationApi from "@/lib/apis/notification.api";

function resolveErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function NotificationFeedCard({ item }: { item: NotificationFeedItem }) {
  return (
    <article className="rounded-3xl border border-border-default bg-bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
              Thông báo từ admin
            </span>
            {item.version > 1 && (
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Điều chỉnh v{item.version}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-lg font-semibold text-text-primary">
            {item.title}
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
            {item.message}
          </p>
        </div>

        <div className="grid shrink-0 gap-3 text-xs text-text-muted sm:min-w-[220px]">
          <div className="rounded-2xl border border-border-default bg-bg-secondary/45 px-3 py-2">
            <p className="font-semibold uppercase tracking-[0.18em] text-text-muted">
              Push lúc
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {formatDateTime(item.lastPushedAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-default bg-bg-secondary/45 px-3 py-2">
            <p className="font-semibold uppercase tracking-[0.18em] text-text-muted">
              Người tạo
            </p>
            <p className="mt-1 text-sm font-medium text-text-primary">
              {item.createdBy?.displayName ?? "Admin"}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function StaffNotificationPage() {
  const notificationsQuery = useQuery({
    queryKey: ["notifications", "feed"],
    queryFn: () => notificationApi.getNotificationFeed({ limit: 100 }),
    staleTime: 30_000,
  });

  const notifications = notificationsQuery.data ?? [];
  const adjustedCount = notifications.filter((item) => item.version > 1).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <section className="relative overflow-hidden rounded-3xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-5 shadow-sm sm:p-6">
        <div
          className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-primary/12 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-14 left-10 size-32 rounded-full bg-warning/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Notification Feed
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-text-primary sm:text-3xl">
              Thông báo từ admin
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
              Mọi thông báo admin đã push sẽ được lưu trong feed này. Khi bạn đang online,
              bản mới hoặc bản điều chỉnh còn xuất hiện ngay bằng toast Sonner ở góc màn hình.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border-default bg-bg-surface/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Tổng thông báo
              </p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">
                {notifications.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border-default bg-bg-surface/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Bản điều chỉnh
              </p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">
                {adjustedCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Feed đã phát
            </p>
            <h2 className="mt-2 text-xl font-semibold text-text-primary">
              Lịch sử thông báo gần nhất
            </h2>
          </div>
          <button
            type="button"
            onClick={() => notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
            className="min-h-10 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
          >
            Làm mới
          </button>
        </div>

        {notificationsQuery.isLoading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-3xl border border-border-default bg-bg-secondary/60"
              />
            ))}
          </div>
        ) : notificationsQuery.isError ? (
          <div className="mt-5 rounded-2xl border border-error/20 bg-error/10 px-4 py-5 text-sm text-error">
            {resolveErrorMessage(
              notificationsQuery.error,
              "Không tải được feed thông báo.",
            )}
          </div>
        ) : notifications.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border-default bg-bg-secondary/35 px-4 py-10 text-center text-sm text-text-secondary">
            Chưa có thông báo nào từ admin.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {notifications.map((item) => (
              <NotificationFeedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
