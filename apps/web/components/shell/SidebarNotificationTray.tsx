"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { NotificationFeedItem } from "@/dtos/notification.dto";
import {
  getNotificationFeed,
  markNotificationFeedRead,
} from "@/lib/apis/notification.api";
import { NOTIFICATION_FEED_QUERY_KEY } from "@/lib/notification-feed-query";
import {
  OPEN_NOTIFICATION_DETAIL_EVENT,
  type OpenNotificationDetailPayload,
} from "@/lib/notification-tray-events";
import { NotificationFeedDetailModal } from "./NotificationFeedDetailModal";
import { SidebarNotificationBellButton } from "./SidebarNotificationBellButton";
import { SidebarNotificationPanel } from "./SidebarNotificationPanel";

export function SidebarNotificationTray({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [ephemeralDetailItem, setEphemeralDetailItem] =
    useState<NotificationFeedItem | null>(null);

  useEffect(() => {
    setPortalEl(document.body);
  }, []);

  const feedQuery = useQuery({
    queryKey: [...NOTIFICATION_FEED_QUERY_KEY, 80],
    queryFn: () => getNotificationFeed({ limit: 80 }),
    staleTime: 30_000,
  });

  const items = feedQuery.data ?? [];

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
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_FEED_QUERY_KEY });
      const previous = queryClient.getQueriesData<NotificationFeedItem[]>({
        queryKey: NOTIFICATION_FEED_QUERY_KEY,
      });
      queryClient.setQueriesData<NotificationFeedItem[]>(
        { queryKey: NOTIFICATION_FEED_QUERY_KEY },
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_FEED_QUERY_KEY });
    },
  });

  const handleSelectItem = useCallback(
    (item: NotificationFeedItem) => {
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

  const closePanel = useCallback(() => setPanelOpen(false), []);

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
      const existing = items.find((item) => item.id === detail.id);
      if (existing) {
        handleSelectItem(existing);
        return;
      }

      const refreshed = await feedQuery.refetch();
      const latestItems = refreshed.data ?? [];
      const fromRefetch = latestItems.find((item) => item.id === detail.id);
      if (fromRefetch) {
        handleSelectItem(fromRefetch);
        return;
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
    portalEl != null
      ? createPortal(
          <>
            <SidebarNotificationPanel
              open={panelOpen}
              onClose={closePanel}
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
          portalEl,
        )
      : null;

  return (
    <>
      <SidebarNotificationBellButton
        unreadCount={unreadCount}
        onClick={() => setPanelOpen(true)}
        compact={compact}
      />
      {overlays}
    </>
  );
}
