export type NotificationStatus = "draft" | "published";
export type NotificationDeliveryKind = "published" | "adjusted";

export interface NotificationAuthor {
  userId: string | null;
  accountHandle: string | null;
  email: string | null;
  displayName: string | null;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  status: NotificationStatus;
  version: number;
  pushCount: number;
  lastPushedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: NotificationAuthor | null;
}

export interface NotificationFeedItem {
  id: string;
  title: string;
  message: string;
  status: "published";
  version: number;
  pushCount: number;
  lastPushedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: NotificationAuthor | null;
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
}

export interface UpdateNotificationPayload {
  title?: string;
  message?: string;
}

export interface PushNotificationPayload {
  title?: string;
  message?: string;
}

export interface NotificationPushEvent {
  id: string;
  title: string;
  message: string;
  version: number;
  lastPushedAt: string;
  deliveryKind: NotificationDeliveryKind;
}
