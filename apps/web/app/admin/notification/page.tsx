"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowPathIcon,
  CheckIcon,
  DocumentPlusIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import RichTextEditor from "@/components/ui/RichTextEditor";
import type {
  AdminNotificationItem,
  UpdateNotificationPayload,
} from "@/dtos/notification.dto";
import { formatDateTime } from "@/lib/class.helpers";
import * as notificationApi from "@/lib/apis/notification.api";
import { sanitizeRichTextContent } from "@/lib/sanitize";

type ComposerMode = "create" | "edit-draft" | "repush";

/** UI-only demo state; not sent to the API. */
type NotificationTargetUserRole = "admin" | "staff" | "student";
type NotificationTargetStaffRole =
  | "teacher"
  | "assistant"
  | "accountant"
  | "customer_care"
  | "lesson_plan"
  | "communication";

type DemoRecipientOption = {
  userId: string;
  displayName: string;
  email: string | null;
  accountHandle: string | null;
};

const DEMO_MOCK_USERS: DemoRecipientOption[] = [
  {
    userId: "demo-user-1",
    displayName: "Nguyễn Minh An",
    email: "minhan@example.com",
    accountHandle: "minhan",
  },
  {
    userId: "demo-user-2",
    displayName: "Trần Thu Hà",
    email: "thuha@example.com",
    accountHandle: "thuha",
  },
  {
    userId: "demo-user-3",
    displayName: "Lê Quốc Bảo",
    email: null,
    accountHandle: "lqbao",
  },
];

type NotificationFormState = {
  title: string;
  message: string;
};

type RecipientDemoState = {
  targetAll: boolean;
  targetUserIds: string[];
  targetRoleTypes: NotificationTargetUserRole[];
  targetStaffRoles: NotificationTargetStaffRole[];
};

const EMPTY_FORM: NotificationFormState = {
  title: "",
  message: "",
};

const EMPTY_RECIPIENT_DEMO: RecipientDemoState = {
  targetAll: true,
  targetUserIds: [],
  targetRoleTypes: [],
  targetStaffRoles: [],
};

const PRESET_TARGET_TAGS = [
  { key: "@all", label: "@all", kind: "all" as const },
  { key: "@admin", label: "@admin", kind: "roleType" as const, value: "admin" as const },
  { key: "@staff", label: "@staff", kind: "roleType" as const, value: "staff" as const },
  { key: "@student", label: "@student", kind: "roleType" as const, value: "student" as const },
  { key: "@teacher", label: "@teacher", kind: "staffRole" as const, value: "teacher" as const },
  { key: "@assistant", label: "@assistant", kind: "staffRole" as const, value: "assistant" as const },
  { key: "@accountant", label: "@accountant", kind: "staffRole" as const, value: "accountant" as const },
  { key: "@customer_care", label: "@customer_care", kind: "staffRole" as const, value: "customer_care" as const },
  { key: "@lesson_plan", label: "@lesson_plan", kind: "staffRole" as const, value: "lesson_plan" as const },
  { key: "@communication", label: "@communication", kind: "staffRole" as const, value: "communication" as const },
];

const INPUT_CLASS =
  "min-h-11 w-full rounded-2xl border border-border-default bg-bg-surface px-4 py-3 text-sm text-text-primary shadow-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/40";

function hasMeaningfulNotificationContent(message: string): boolean {
  const plainText = message
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length > 0;
}

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
        eyebrow: "Sửa nháp",
        title: "Cập nhật bản nháp",
        description: "Chỉ lưu nội bộ cho đến khi push.",
        submitLabel: "Lưu nháp",
      };
    case "repush":
      return {
        eyebrow: "Push lại",
        title: "Sửa và push lại",
        description: "Gửi bản cập nhật ngay.",
        submitLabel: "Sửa & Push lại",
      };
    default:
      return {
        eyebrow: "Tạo thông báo",
        title: "Soạn thông báo mới",
        description: "Tạo nháp trước, push sau.",
        submitLabel: "Tạo nháp",
      };
  }
}

function getSubmitAriaLabel(mode: ComposerMode, isMutating: boolean) {
  if (isMutating) return "Đang xử lý";
  if (mode === "edit-draft") return "Lưu nháp";
  if (mode === "repush") return "Sửa và push lại";
  return "Tạo nháp";
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
    <article className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm">
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

          <h2 className="mt-3 text-xl font-bold leading-snug text-text-primary">
            {item.title}
          </h2>
          <div
            className="mt-2 line-clamp-4 text-sm leading-6 text-text-secondary [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextContent(item.message) }}
          />
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isPublished ? (
            <button
              type="button"
              onClick={() => onRepush(item)}
              disabled={disabled}
              aria-label="Sửa và push lại"
              title="Sửa và push lại"
              className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PaperAirplaneIcon className="size-5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onEditDraft(item)}
                disabled={disabled}
                aria-label="Sửa nháp"
                title="Sửa nháp"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PencilSquareIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => onPush(item)}
                disabled={disabled}
                aria-label="Push thông báo"
                title="Push thông báo"
                className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PaperAirplaneIcon className="size-5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={disabled}
            aria-label="Xóa thông báo"
            title="Xóa thông báo"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-error/25 bg-error/10 text-error transition hover:bg-error/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-error/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <TrashIcon className="size-5" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
        <span>Người tạo: {item.createdBy?.displayName ?? "Không rõ"}</span>
        <span>Cập nhật: {formatDateTime(item.updatedAt)}</span>
        <span>Push: {formatDateTime(item.lastPushedAt)}</span>
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
  const [recipientDemo, setRecipientDemo] =
    useState<RecipientDemoState>(EMPTY_RECIPIENT_DEMO);
  const [recipientSearch, setRecipientSearch] = useState("");
  const recipientInputRef = useRef<HTMLInputElement | null>(null);

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
    setRecipientDemo(EMPTY_RECIPIENT_DEMO);
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
      payload: UpdateNotificationPayload;
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
      payload?: UpdateNotificationPayload;
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
    setRecipientDemo(EMPTY_RECIPIENT_DEMO);
  };

  const handleRepush = (item: AdminNotificationItem) => {
    setComposerMode("repush");
    setActiveNotificationId(item.id);
    setForm({
      title: item.title,
      message: item.message,
    });
    setRecipientDemo(EMPTY_RECIPIENT_DEMO);
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

    if (!title || !hasMeaningfulNotificationContent(message)) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }

    if (composerMode === "create") {
      createMutation.mutate({
        title,
        message,
      });
      return;
    }

    if (!activeNotificationId) {
      toast.error("Không xác định được thông báo đang chỉnh sửa.");
      return;
    }

    if (composerMode === "edit-draft") {
      updateDraftMutation.mutate({
        id: activeNotificationId,
        payload: {
          title,
          message,
        },
      });
      return;
    }

    pushMutation.mutate({
      id: activeNotificationId,
      payload: {
        title,
        message,
      },
    });
  };

  const filteredDemoUsers = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q || q.startsWith("@")) return [];
    return DEMO_MOCK_USERS.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.accountHandle?.toLowerCase().includes(q) ?? false),
    ).slice(0, 12);
  }, [recipientSearch]);

  const selectedUserOptions = useMemo(() => {
    const map = new Map(DEMO_MOCK_USERS.map((option) => [option.userId, option]));
    return recipientDemo.targetUserIds.map(
      (userId) =>
        map.get(userId) ?? {
          userId,
          displayName: userId,
          email: null,
          accountHandle: null,
        },
    );
  }, [recipientDemo.targetUserIds]);

  const selectedTargetTags = useMemo(() => {
    const tags: string[] = [];
    if (recipientDemo.targetAll) tags.push("@all");
    recipientDemo.targetRoleTypes.forEach((roleType) => tags.push(`@${roleType}`));
    recipientDemo.targetStaffRoles.forEach((role) => tags.push(`@${role}`));
    return tags;
  }, [recipientDemo.targetAll, recipientDemo.targetRoleTypes, recipientDemo.targetStaffRoles]);

  const filteredPresetTags = useMemo(() => {
    const keyword = recipientSearch.trim().toLowerCase();
    if (!keyword.startsWith("@")) return [];
    return PRESET_TARGET_TAGS.filter((tag) =>
      tag.label.toLowerCase().includes(keyword),
    );
  }, [recipientSearch]);

  const addRecipientUser = (userId: string) => {
    setRecipientDemo((current) => ({
      ...current,
      targetAll: false,
      targetUserIds: current.targetUserIds.includes(userId)
        ? current.targetUserIds
        : [...current.targetUserIds, userId],
    }));
    setRecipientSearch("");
  };

  const removeRecipientUser = (userId: string) => {
    setRecipientDemo((current) => ({
      ...current,
      targetUserIds: current.targetUserIds.filter((id) => id !== userId),
    }));
  };

  const removeTargetTag = (tagLabel: string) => {
    setRecipientDemo((current) => {
      if (tagLabel === "@all") {
        return { ...current, targetAll: false };
      }
      if (tagLabel === "@admin" || tagLabel === "@staff" || tagLabel === "@student") {
        return {
          ...current,
          targetRoleTypes: current.targetRoleTypes.filter(
            (roleType) => `@${roleType}` !== tagLabel,
          ),
        };
      }
      return {
        ...current,
        targetStaffRoles: current.targetStaffRoles.filter(
          (role) => `@${role}` !== tagLabel,
        ),
      };
    });
  };

  const togglePresetTag = (tagKey: string) => {
    const tag = PRESET_TARGET_TAGS.find((item) => item.key === tagKey);
    if (!tag) return;
    setRecipientDemo((current) => {
      if (tag.kind === "all") {
        return {
          ...current,
          targetAll: !current.targetAll,
        };
      }
      if (tag.kind === "roleType") {
        const exists = current.targetRoleTypes.includes(tag.value);
        return {
          ...current,
          targetAll: false,
          targetRoleTypes: exists
            ? current.targetRoleTypes.filter((roleType) => roleType !== tag.value)
            : [...current.targetRoleTypes, tag.value],
        };
      }
      const exists = current.targetStaffRoles.includes(tag.value);
      return {
        ...current,
        targetAll: false,
        targetStaffRoles: exists
          ? current.targetStaffRoles.filter((role) => role !== tag.value)
          : [...current.targetStaffRoles, tag.value],
      };
    });
  };

  return (
    <div className="min-h-0 bg-bg-primary p-3 pb-6 sm:p-5">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <section className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Notifications
              </p>
              <h1 className="mt-2 text-xl font-semibold text-text-primary sm:text-2xl">
                Quản lý thông báo
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border-default bg-bg-secondary/35 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Tổng
                </p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {notifications.length}
                </p>
              </div>
              <div className="rounded-xl border border-border-default bg-bg-secondary/35 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Nháp
                </p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {draftNotifications.length}
                </p>
              </div>
              <div className="rounded-xl border border-border-default bg-bg-secondary/35 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Đã phát
                </p>
                <p className="mt-1 text-xl font-semibold text-text-primary">
                  {publishedNotifications.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {composerCopy.eyebrow}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-text-primary">
                  {composerCopy.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  {composerCopy.description}
                </p>
              </div>
              {composerMode !== "create" && (
                <button
                  type="button"
                  onClick={resetComposer}
                  aria-label="Tạo thông báo mới"
                  title="Tạo thông báo mới"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  <DocumentPlusIcon className="size-5" />
                </button>
              )}
            </div>

            <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-text-secondary">
                  Người nhận
                  <span className="rounded-full border border-dashed border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
                    Demo
                  </span>
                  <span className="text-xs font-normal text-text-muted">
                    Mock data — không gửi lên server
                  </span>
                </span>
                <div className="rounded-2xl border border-border-default bg-bg-surface p-2">
                  <div
                    className="flex items-center gap-2 border-b border-border-default px-2 pb-2"
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("button")) return;
                      recipientInputRef.current?.focus();
                    }}
                  >
                    <span className="text-sm font-medium text-text-secondary">To</span>
                    <div className="flex min-h-9 flex-1 flex-wrap items-center gap-1.5">
                    {selectedTargetTags.map((tagLabel) => (
                      <span
                        key={tagLabel}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-primary"
                      >
                        {tagLabel}
                        <button
                          type="button"
                          onClick={() => removeTargetTag(tagLabel)}
                          onMouseDown={(event) => event.stopPropagation()}
                          className="text-primary/80 hover:text-primary"
                          aria-label={`Bỏ ${tagLabel}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {selectedUserOptions.map((user) => (
                      <span
                        key={user.userId}
                        className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-primary"
                      >
                        {user.displayName}
                        <button
                          type="button"
                          onClick={() => removeRecipientUser(user.userId)}
                          onMouseDown={(event) => event.stopPropagation()}
                          className="text-text-muted hover:text-error"
                          aria-label={`Bỏ ${user.displayName}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                      <input
                        ref={recipientInputRef}
                        value={recipientSearch}
                        onChange={(event) => setRecipientSearch(event.target.value)}
                        placeholder="Thử tìm mock (ví dụ: nguyễn) hoặc @..."
                        className="min-h-8 min-w-[180px] flex-1 bg-transparent px-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
                      />
                    </div>
                  </div>
                  <div className="h-2" />
                  {recipientSearch.trim().startsWith("@") &&
                    filteredPresetTags.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border-default bg-bg-surface p-1.5 shadow-sm">
                      {filteredPresetTags.map((tag) => (
                        <button
                          key={tag.key}
                          type="button"
                          onClick={() => {
                            togglePresetTag(tag.key);
                            setRecipientSearch("");
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg-secondary"
                        >
                          <span className="truncate text-text-primary">
                            {tag.label}
                          </span>
                          <span className="ml-2 text-xs text-text-muted">Tag</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!recipientSearch.trim().startsWith("@") &&
                    recipientSearch.trim().length > 0 && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border-default bg-bg-surface p-1.5 shadow-sm">
                      {filteredDemoUsers.length === 0 ? (
                        <div className="px-2.5 py-2 text-sm text-text-muted">
                          Không có user mock phù hợp.
                        </div>
                      ) : (
                        filteredDemoUsers.map((option) => (
                          <button
                            key={option.userId}
                            type="button"
                            onClick={() => addRecipientUser(option.userId)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-bg-secondary"
                          >
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              {(option.displayName?.[0] ?? "?").toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-text-primary">
                                {option.displayName}
                              </span>
                              <span className="block truncate text-xs text-text-muted">
                                {option.email ?? option.accountHandle}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </label>

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
                  className={`${INPUT_CLASS} text-lg font-bold tracking-tight`}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-text-secondary">
                  Nội dung
                </span>
                <RichTextEditor
                  value={form.message}
                  onChange={(nextValue) =>
                    setForm((current) => ({
                      ...current,
                      message: nextValue,
                    }))
                  }
                  minHeight="min-h-[200px]"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isMutating}
                  aria-label={getSubmitAriaLabel(composerMode, isMutating)}
                  title={getSubmitAriaLabel(composerMode, isMutating)}
                  className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary text-text-inverse transition hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMutating ? (
                    <ArrowPathIcon className="size-5 animate-spin" />
                  ) : composerMode === "edit-draft" ? (
                    <CheckIcon className="size-5" />
                  ) : composerMode === "repush" ? (
                    <PaperAirplaneIcon className="size-5" />
                  ) : (
                    <DocumentPlusIcon className="size-5" />
                  )}
                </button>
                {composerMode !== "create" && (
                  <button
                    type="button"
                    onClick={resetComposer}
                    disabled={isMutating}
                    aria-label="Hủy chỉnh sửa"
                    title="Hủy chỉnh sửa"
                    className="inline-flex size-11 items-center justify-center rounded-2xl border border-border-default bg-bg-surface text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XMarkIcon className="size-5" />
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Danh sách
                </p>
                <h2 className="mt-1 text-lg font-semibold text-text-primary">
                  Nháp & đã phát
                </h2>
              </div>
              <button
                type="button"
                onClick={() => notificationsQuery.refetch()}
                disabled={notificationsQuery.isFetching}
                aria-label="Làm mới danh sách"
                title="Làm mới danh sách"
                className="inline-flex size-10 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-primary transition hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowPathIcon
                  className={`size-5 ${notificationsQuery.isFetching ? "animate-spin" : ""}`}
                />
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
                Chưa có thông báo nào.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
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
                        Không có bản nháp.
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
                        Chưa có thông báo đã phát.
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
