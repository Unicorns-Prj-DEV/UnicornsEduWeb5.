import type { QueryClient } from "@tanstack/react-query";
import {
  actionHistoryKeys,
  authKeys,
  calendarKeys,
  notificationsKeys,
  staffCalendarKeys,
} from "@/lib/query-keys";

export async function clearSessionScopedQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: authKeys.all });
  queryClient.removeQueries({ queryKey: authKeys.all });
}

export async function clearLogoutScopedQueries(queryClient: QueryClient) {
  await Promise.all([
    clearSessionScopedQueries(queryClient),
    clearNotificationScopedQueries(queryClient),
    clearActionHistoryScopedQueries(queryClient),
  ]);
}

export async function clearNotificationScopedQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: notificationsKeys.all });
  queryClient.removeQueries({ queryKey: notificationsKeys.all });
}

export async function clearActionHistoryScopedQueries(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: actionHistoryKeys.all });
  queryClient.removeQueries({ queryKey: actionHistoryKeys.all });
}

export async function invalidateCalendarScopedQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: calendarKeys.all }),
    queryClient.invalidateQueries({ queryKey: staffCalendarKeys.all }),
  ]);
}

export async function invalidateNotificationScopedQueries(
  queryClient: QueryClient,
) {
  await queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
}

export async function invalidateAdminNotificationScopedQueries(
  queryClient: QueryClient,
) {
  await queryClient.invalidateQueries({
    queryKey: [...notificationsKeys.all, "admin"],
  });
}

export async function invalidateNotificationFeedScopedQueries(
  queryClient: QueryClient,
) {
  await queryClient.invalidateQueries({
    queryKey: [...notificationsKeys.all, "feed"],
  });
}

export async function invalidateActionHistoryScopedQueries(
  queryClient: QueryClient,
) {
  await queryClient.invalidateQueries({ queryKey: actionHistoryKeys.all });
}
