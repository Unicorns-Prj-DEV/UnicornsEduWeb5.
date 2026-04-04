"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminNotificationItem } from "@/dtos/notification.dto";
import { formatDateTime } from "@/lib/class.helpers";
import * as notificationApi from "@/lib/apis/notification.api";

type ComposerMode = "create" | "edit-draft" | "repush";

type NotificationFormState = {
  title: string;
  message: string;
};

const EMPTY_FORM: NotificationFormState = {
  title: "",
  message: "",
};

const INPUT_CLASS =
  "min-h-11 w-full rounded-2xl border border-border-default bg-bg-surface px-4 py-3 text-sm text-text-primary shadow-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/40";

function resolveErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function getStatusTone(status: AdminNotificationItem["status"]) {
  if (status === "published") {
    return "border-success/20 bg-success/10 text-success";
  }

  return "border-warning/20 bg-warning/10 text-warning";
}

function getComposerCopy(mode: ComposerMode) {
  switch (mode) {
    case "edit-draft":
      return {
        eyebrow: "Đang sửa nháp",
        title: "Cập nhật nội dung trước khi phát",
        description:
          "Bản nháp chỉ lưu trong hệ thống, staff chưa nhận toast cho đến khi bạn push.",
        submitLabel: "Lưu nháp",
      };
    case "repush":
      return {
        eyebrow: "Điều chỉnh thông báo",
        title: "Sửa nội dung và push lại ngay",
        description:
          "Khi lưu, staff đang online sẽ nhận toast `Điều chỉnh thông báo` theo nội dung mới nhất.",
        submitLabel: "Sửa & Push lại",
      };
    default:
      return {
        eyebrow: "Tạo thông báo",
        title: "Soạn một thông báo mới cho staff",
        description:
          "Tạo ở trạng thái nháp trước, sau đó bạn có thể push khi nội dung đã sẵn sàng.",
        submitLabel: "Tạo nháp",
      };
  }
}

function NotificationListCard({
  item,
  onEditDraft,
  onRepush,
  onPush,
  onDelete,
  disabled,
}: {
  item: AdminNotificationItem;
  onEditDraft: (item: AdminNotificationItem) => void;
  onRepush: (item: AdminNotificationItem) => void;
  onPush: (item: AdminNotificationItem) => void;
  onDelete: (item: AdminNotificationItem) => void;
  disabled: boolean;
}) {
  const isPublished = item.status === "published";

  return (
    <article className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusTone(item.status)}`}
            >
              {isPublished ? "Đã phát" : "Nháp"}
            </span>
            <span className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
              v{item.version}
            </span>
            <span className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
              Push {item.pushCount}
            </span>
          </div>

          <h2 className="mt-3 text-base font-semibold text-text-primary">
            {item.title}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
            {item.message}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isPublished ? (
            <button
              type="button"
              onClick={() => onRepush(item)}
              disabled={disabled}
              className="min-h-10 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sửa & Push lại
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onEditDraft(item)}
                disabled={disabled}
                className="min-h-10 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sửa
              </button>
              <button
                type="button"
                onClick={() => onPush(item)}
                disabled={disabled}
                className="min-h-10 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
              >
                Push
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={disabled}
            className="min-h-10 rounded-xl border border-error/25 bg-error/10 px-3.5 py-2 text-sm font-medium text-error transition hover:bg-error/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-error/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Xóa
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-text-muted sm:grid-cols-3">
        <div className="rounded-xl border border-border-default bg-bg-secondary/45 px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.18em] text-text-muted">
            Người tạo
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {item.createdBy?.displayName ?? "Không rõ"}
          </p>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-secondary/45 px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.18em] text-text-muted">
            Cập nhật
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {formatDateTime(item.updatedAt)}
          </p>
        </div>
        <div className="rounded-xl border border-border-default bg-bg-secondary/45 px-3 py-2">
          <p className="font-semibold uppercase tracking-[0.18em] text-text-muted">
            Push gần nhất
          </p>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {formatDateTime(item.lastPushedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function AdminNotificationPage() {
  const queryClient = useQueryClient();
  const [composerMode, setComposerMode] = useState<ComposerMode>("create");
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<NotificationFormState>(EMPTY_FORM);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "admin"],
    queryFn: () => notificationApi.getAdminNotifications({ limit: 250 }),
    staleTime: 30_000,
  });

  const invalidateNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const resetComposer = () => {
    setComposerMode("create");
    setActiveNotificationId(null);
    setForm(EMPTY_FORM);
  };

  const createMutation = useMutation({
    mutationFn: notificationApi.createNotificationDraft,
    onSuccess: async () => {
      await invalidateNotifications();
      toast.success("Đã tạo thông báo nháp.");
      resetComposer();
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error, "Không tạo được thông báo."));
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: NotificationFormState;
    }) => notificationApi.updateNotificationDraft(id, payload),
    onSuccess: async () => {
      await invalidateNotifications();
      toast.success("Đã lưu lại bản nháp.");
      resetComposer();
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error, "Không cập nhật được bản nháp."));
    },
  });

  const pushMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: Partial<NotificationFormState>;
    }) => notificationApi.pushNotification(id, payload),
    onSuccess: async (notification) => {
      await invalidateNotifications();
      toast.success(
        notification.version > 1
          ? "Đã điều chỉnh và push lại thông báo."
          : "Đã push thông báo tới toàn bộ staff.",
      );
      if (activeNotificationId === notification.id) {
        resetComposer();
      }
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error, "Không push được thông báo."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationApi.deleteNotification,
    onSuccess: async ({ id }) => {
      await invalidateNotifications();
      toast.success("Đã xóa thông báo.");
      if (activeNotificationId === id) {
        resetComposer();
      }
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error, "Không xóa được thông báo."));
    },
  });

  const notifications = notificationsQuery.data ?? [];
  const draftNotifications = notifications.filter((item) => item.status === "draft");
  const publishedNotifications = notifications.filter(
    (item) => item.status === "published",
  );
  const isMutating =
    createMutation.isPending ||
    updateDraftMutation.isPending ||
    pushMutation.isPending ||
    deleteMutation.isPending;
  const composerCopy = getComposerCopy(composerMode);

  const handleDraftEdit = (item: AdminNotificationItem) => {
    setComposerMode("edit-draft");
    setActiveNotificationId(item.id);
    setForm({
      title: item.title,
      message: item.message,
    });
  };

  const handleRepush = (item: AdminNotificationItem) => {
    setComposerMode("repush");
    setActiveNotificationId(item.id);
    setForm({
      title: item.title,
      message: item.message,
    });
  };

  const handleQuickPush = (item: AdminNotificationItem) => {
    pushMutation.mutate({ id: item.id });
  };

  const handleDelete = (item: AdminNotificationItem) => {
    const confirmed = window.confirm(
      item.status === "draft"
        ? "Xóa bản nháp này?"
        : "Xóa thông báo đã phát? Staff sẽ không còn thấy nó trong feed sau lần tải kế tiếp.",
    );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const message = form.message.trim();

    if (!title || !message) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }

    if (composerMode === "create") {
      createMutation.mutate({ title, message });
      return;
    }

    if (!activeNotificationId) {
      toast.error("Không xác định được thông báo đang chỉnh sửa.");
      return;
    }

    if (composerMode === "edit-draft") {
      updateDraftMutation.mutate({
        id: activeNotificationId,
        payload: { title, message },
      });
      return;
    }

    pushMutation.mutate({
      id: activeNotificationId,
      payload: { title, message },
    });
  };

  return (
    <div className="min-h-0 bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <section className="relative overflow-hidden rounded-3xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-5 shadow-sm sm:p-6">
          <div
            className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-primary/12 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-14 left-12 size-32 rounded-full bg-warning/10 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Push Notifications
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-text-primary sm:text-3xl">
                Quản lý thông báo realtime cho staff
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
                Admin tạo nháp, chỉnh sửa, xóa và push thông báo từ đây. Khi push, hệ
                thống vừa lưu vào database vừa broadcast qua websocket để toàn bộ staff
                đang online nhận toast Sonner ngay lập tức.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border-default bg-bg-surface/85 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Tổng bản ghi
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {notifications.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border-default bg-bg-surface/85 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Bản nháp
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {draftNotifications.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border-default bg-bg-surface/85 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Đã phát
                </p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">
                  {publishedNotifications.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="rounded-3xl border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {composerCopy.eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">
                  {composerCopy.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {composerCopy.description}
                </p>
              </div>
              {composerMode !== "create" && (
                <button
                  type="button"
                  onClick={resetComposer}
                  className="min-h-10 shrink-0 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Tạo thông báo mới
                </button>
              )}
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-text-secondary">
                  Tiêu đề
                </span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Điều chỉnh lịch họp đầu tuần"
                  className={INPUT_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-text-secondary">
                  Nội dung
                </span>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Nhập nội dung staff sẽ thấy trong toast và feed."
                  rows={8}
                  className={`${INPUT_CLASS} min-h-[220px] resize-y py-3`}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isMutating}
                  className="min-h-11 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMutating ? "Đang xử lý..." : composerCopy.submitLabel}
                </button>
                {composerMode !== "create" && (
                  <button
                    type="button"
                    onClick={resetComposer}
                    disabled={isMutating}
                    className="min-h-11 rounded-2xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-3xl border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Danh sách thông báo
                </p>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">
                  Draft và bản đã phát
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
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-40 animate-pulse rounded-2xl border border-border-default bg-bg-secondary/60"
                  />
                ))}
              </div>
            ) : notificationsQuery.isError ? (
              <div className="mt-5 rounded-2xl border border-error/20 bg-error/10 px-4 py-5 text-sm text-error">
                {resolveErrorMessage(
                  notificationsQuery.error,
                  "Không tải được danh sách thông báo.",
                )}
              </div>
            ) : notifications.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-border-default bg-bg-secondary/35 px-4 py-10 text-center text-sm text-text-secondary">
                Chưa có thông báo nào. Hãy tạo bản nháp đầu tiên ở khối bên trái.
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Bản nháp
                    </h3>
                    <span className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
                      {draftNotifications.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {draftNotifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/35 px-4 py-6 text-sm text-text-secondary">
                        Không có bản nháp nào đang chờ push.
                      </div>
                    ) : (
                      draftNotifications.map((item) => (
                        <NotificationListCard
                          key={item.id}
                          item={item}
                          onEditDraft={handleDraftEdit}
                          onRepush={handleRepush}
                          onPush={handleQuickPush}
                          onDelete={handleDelete}
                          disabled={isMutating}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Đã phát
                    </h3>
                    <span className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
                      {publishedNotifications.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {publishedNotifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/35 px-4 py-6 text-sm text-text-secondary">
                        Chưa có thông báo nào được push tới staff.
                      </div>
                    ) : (
                      publishedNotifications.map((item) => (
                        <NotificationListCard
                          key={item.id}
                          item={item}
                          onEditDraft={handleDraftEdit}
                          onRepush={handleRepush}
                          onPush={handleQuickPush}
                          onDelete={handleDelete}
                          disabled={isMutating}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
