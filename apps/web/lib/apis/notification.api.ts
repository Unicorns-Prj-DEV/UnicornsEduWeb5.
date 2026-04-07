import type {
  AdminNotificationItem,
  CreateNotificationPayload,
  NotificationFeedItem,
  NotificationRecipientOption,
  NotificationStatus,
  PushNotificationPayload,
  UpdateNotificationPayload,
} from "@/dtos/notification.dto";
import { api } from "../client";

export async function getAdminNotifications(params?: {
  status?: NotificationStatus;
  limit?: number;
}): Promise<AdminNotificationItem[]> {
  const response = await api.get<AdminNotificationItem[]>("/notifications", {
    params: {
      ...(params?.status ? { status: params.status } : {}),
      ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createNotificationDraft(
  payload: CreateNotificationPayload,
): Promise<AdminNotificationItem> {
  const response = await api.post<AdminNotificationItem>(
    "/notifications",
    payload,
  );
  return response.data;
}

export async function updateNotificationDraft(
  id: string,
  payload: UpdateNotificationPayload,
): Promise<AdminNotificationItem> {
  const response = await api.patch<AdminNotificationItem>(
    `/notifications/${id}`,
    payload,
  );
  return response.data;
}

export async function pushNotification(
  id: string,
  payload?: PushNotificationPayload,
): Promise<AdminNotificationItem> {
  const response = await api.post<AdminNotificationItem>(
    `/notifications/${id}/push`,
    payload ?? {},
  );
  return response.data;
}

export async function deleteNotification(id: string): Promise<{ id: string }> {
  const response = await api.delete<{ id: string }>(`/notifications/${id}`);
  return response.data;
}

export async function getNotificationFeed(params?: {
  limit?: number;
}): Promise<NotificationFeedItem[]> {
  const response = await api.get<NotificationFeedItem[]>(
    "/notifications/feed",
    {
      params: {
        ...(typeof params?.limit === "number" ? { limit: params.limit } : {}),
      },
    },
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function getNotificationRecipientOptions(params: {
  search: string;
  limit?: number;
}): Promise<NotificationRecipientOption[]> {
  const response = await api.get<NotificationRecipientOption[]>(
    "/notifications/recipient-options",
    {
      params: {
        search: params.search,
        ...(typeof params.limit === "number" ? { limit: params.limit } : {}),
      },
    },
  );

  return Array.isArray(response.data) ? response.data : [];
}

export async function markNotificationFeedRead(
  notificationId: string,
): Promise<{ id: string; readStatus: "read" }> {
  const response = await api.patch<{ id: string; readStatus: "read" }>(
    `/notifications/feed/${encodeURIComponent(notificationId)}/read`,
  );
  return response.data;
}
