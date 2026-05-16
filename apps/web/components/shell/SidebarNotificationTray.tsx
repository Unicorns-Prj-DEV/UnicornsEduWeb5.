"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { NotificationFeedItem } from "@/dtos/notification.dto";
import {
  extractDirectTopUpRequestId,
  openDirectTopUpApprovalPopup,
} from "@/lib/direct-topup-notification";
import {
  getNotificationFeed,
  markNotificationFeedRead,
} from "@/lib/apis/notification.api";
import { notificationFeedQueryKey } from "@/lib/notification-feed-query";
import {
  OPEN_NOTIFICATION_DETAIL_EVENT,
  type OpenNotificationDetailPayload,
} from "@/lib/notification-tray-events";
import { NotificationFeedDetailModal } from "./NotificationFeedDetailModal";
import { SidebarNotificationBellButton } from "./SidebarNotificationBellButton";
import { SidebarNotificationPanel } from "./SidebarNotificationPanel";

const EMPTY_NOTIFICATION_ITEMS: NotificationFeedItem[] = [];
const FEED_LIMIT = 80;
const FEED_STALE_MS = 30_000;

function shouldRefetchForFreshness(dataUpdatedAt: number) {
  if (!dataUpdatedAt) {
    return true;
  }
  return Date.now() - dataUpdatedAt > FEED_STALE_MS;
}

export function SidebarNotificationTray({
  compact = false,
  enableUnreadWarning = false,
}: {
  compact?: boolean;
  enableUnreadWarning?: boolean;
}) {
  const queryClient = useQueryClient();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"new" | "all">("new");
  const [unreadWarningOpen, setUnreadWarningOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [ephemeralDetailItem, setEphemeralDetailItem] =
    useState<NotificationFeedItem | null>(null);
  const hasShownUnreadWarningRef = useRef(false);

  const feedQuery = useQuery({
    queryKey: notificationFeedQueryKey(FEED_LIMIT),
    queryFn: () => getNotificationFeed({ limit: FEED_LIMIT }),
    staleTime: FEED_STALE_MS,
  });

  const items = useMemo(
    () => feedQuery.data ?? EMPTY_NOTIFICATION_ITEMS,
    [feedQuery.data],
  );

  const unreadCount = useMemo(
    () => items.filter((n) => n.readStatus === "unread").length,
    [items],
  );

  const detailItem = useMemo(
    () =>
      detailId
        ? items.find((n) => n.id === detailId) ?? ephemeralDetailItem
        : ephemeralDetailItem,
    [detailId, items, ephemeralDetailItem],
  );

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationFeedRead(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationFeedQueryKey() });
      const previous = queryClient.getQueriesData<NotificationFeedItem[]>({
        queryKey: notificationFeedQueryKey(),
      });
      queryClient.setQueriesData<NotificationFeedItem[]>(
        { queryKey: notificationFeedQueryKey() },
        (old) =>
          !old
            ? old
            : old.map((row) =>
                row.id === notificationId
                  ? { ...row, readStatus: "read" as const }
                  : row,
              ),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      ctx?.previous?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Không thể đánh dấu đã đọc");
    },
    onSettled: (_data, error) => {
      if (error) {
        queryClient.invalidateQueries({ queryKey: notificationFeedQueryKey() });
      }
    },
  });

  const handleSelectItem = useCallback(
    (item: NotificationFeedItem) => {
      const directTopUpRequestId = extractDirectTopUpRequestId(item.message);
      if (directTopUpRequestId) {
        setPanelOpen(false);
        setDetailOpen(false);
        setDetailId(null);
        setEphemeralDetailItem(null);
        if (item.readStatus === "unread") {
          markReadMutation.mutate(item.id);
        }
        openDirectTopUpApprovalPopup({
          requestId: directTopUpRequestId,
          notificationId: item.id,
        });
        return;
      }

      setEphemeralDetailItem(null);
      setDetailId(item.id);
      setDetailOpen(true);
      setPanelOpen(true);
      if (item.readStatus === "unread") {
        markReadMutation.mutate(item.id);
      }
    },
    [markReadMutation],
  );

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailId(null);
    setEphemeralDetailItem(null);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelTab("new");
  }, []);

  const closeUnreadWarning = useCallback(() => {
    setUnreadWarningOpen(false);
  }, []);

  const openPanelFromWarning = useCallback(() => {
    setUnreadWarningOpen(false);
    setPanelTab("new");
    setPanelOpen(true);
  }, []);

  useEffect(() => {
    if (!enableUnreadWarning) {
      return;
    }
    if (feedQuery.isLoading || feedQuery.isError || !feedQuery.isFetched) {
      return;
    }
    if (hasShownUnreadWarningRef.current) {
      return;
    }
    if (unreadCount <= 0) {
      return;
    }

    hasShownUnreadWarningRef.current = true;
    const timeoutId = window.setTimeout(() => {
      setUnreadWarningOpen(true);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    enableUnreadWarning,
    feedQuery.isError,
    feedQuery.isFetched,
    feedQuery.isLoading,
    unreadCount,
  ]);

  useEffect(() => {
    if (!panelOpen && !detailOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [panelOpen, detailOpen]);

  useEffect(() => {
    const panelOrDetail = panelOpen || detailOpen;
    if (!panelOrDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailOpen) {
        closeDetail();
      } else {
        closePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, detailOpen, closeDetail, closePanel]);

  useEffect(() => {
    const openFromToast = async (event: Event) => {
      const detail = (event as CustomEvent<OpenNotificationDetailPayload>).detail;
      if (!detail?.id) return;

      setPanelOpen(true);
      setPanelTab("new");
      const existing = items.find((item) => item.id === detail.id);
      if (existing) {
        handleSelectItem(existing);
        return;
      }

      if (shouldRefetchForFreshness(feedQuery.dataUpdatedAt)) {
        const refreshed = await feedQuery.refetch();
        const latestItems = refreshed.data ?? [];
        const fromRefetch = latestItems.find((item) => item.id === detail.id);
        if (fromRefetch) {
          handleSelectItem(fromRefetch);
          return;
        }
      }

      setEphemeralDetailItem({
        id: detail.id,
        title: detail.title,
        message: detail.message,
        status: "published",
        readStatus: "unread",
        version: detail.version,
        pushCount: 1,
        lastPushedAt: detail.lastPushedAt,
        createdAt: detail.lastPushedAt,
        updatedAt: detail.lastPushedAt,
        createdBy: null,
      });
      setDetailId(detail.id);
      setDetailOpen(true);
      markReadMutation.mutate(detail.id);
    };

    window.addEventListener(OPEN_NOTIFICATION_DETAIL_EVENT, openFromToast);
    return () => {
      window.removeEventListener(OPEN_NOTIFICATION_DETAIL_EVENT, openFromToast);
    };
  }, [feedQuery, handleSelectItem, items, markReadMutation]);

  const overlays =
    typeof document !== "undefined"
      ? createPortal(
          <>
            {unreadWarningOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[98] bg-black/45"
                  aria-label="Đóng cảnh báo thông báo chưa đọc"
                  onClick={closeUnreadWarning}
                />
                <div className="fixed inset-0 z-[99] flex items-center justify-center px-4">
                  <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-surface p-4 shadow-2xl sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-text-primary sm:text-lg">
                        Cảnh báo còn thông báo chưa đọc
                      </h3>
                      <button
                        type="button"
                        onClick={closeUnreadWarning}
                        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        aria-label="Đóng popup"
                      >
                        <span aria-hidden className="text-lg leading-none">
                          ×
                        </span>
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">
                      Bạn đang có {unreadCount} thông báo chưa đọc. Vui lòng mở
                      mục thông báo để xem các cập nhật mới nhất.
                    </p>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={openPanelFromWarning}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        Xem thông báo
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            <SidebarNotificationPanel
              open={panelOpen}
              onClose={closePanel}
              tab={panelTab}
              onTabChange={setPanelTab}
              items={items}
              isLoading={feedQuery.isLoading}
              isError={feedQuery.isError}
              onRetry={() => feedQuery.refetch()}
              onSelectItem={handleSelectItem}
            />
            <NotificationFeedDetailModal
              open={detailOpen}
              item={detailItem}
              onClose={closeDetail}
            />
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <SidebarNotificationBellButton
        unreadCount={unreadCount}
        onClick={() => {
          setPanelTab("new");
          setPanelOpen(true);
        }}
        compact={compact}
      />
      {overlays}
    </>
  );
}
