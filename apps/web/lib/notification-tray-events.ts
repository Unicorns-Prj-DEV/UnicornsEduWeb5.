import type { NotificationDeliveryKind } from "@/dtos/notification.dto";

export const OPEN_NOTIFICATION_DETAIL_EVENT = "ue:open-notification-detail";

export type OpenNotificationDetailPayload = {
  id: string;
  title: string;
  message: string;
  lastPushedAt: string;
  deliveryKind: NotificationDeliveryKind;
  version: number;
};

