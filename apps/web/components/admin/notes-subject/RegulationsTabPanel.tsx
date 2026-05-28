"use client";

import {
  Fragment,
  useCallback,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { CheckIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import RegulationAudienceBadges from "./RegulationAudienceBadges";
import RegulationResourceLink from "./RegulationResourceLink";
import type { RulePostFormValues, RulePostItem } from "./RulePostFormPopup";
import RulePostEditTable from "./RulePostEditTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  rulePosts: RulePostItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onUpdateRule: (id: string, values: RulePostFormValues) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  deletingRuleId?: string | null;
};

function truncate(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function isInteractiveEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      "button,a,input,textarea,select,[role='button'],[role='link'],[contenteditable='true']",
    ),
  );
}

export default function RegulationsTabPanel({
  rulePosts,
  isLoading,
  isError,
  onRetry,
  onUpdateRule,
  onDeleteRule,
  deletingRuleId = null,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleRowActivate = useCallback((id: string) => {
    setSelectedId((current) => (current === id ? null : id));
    setConfirmDeleteId((current) => (current === id ? current : null));
  }, []);

  const handleSave = useCallback(
    async (id: string, values: RulePostFormValues) => {
      try {
        await onUpdateRule(id, values);
        toast.success("Đã cập nhật quy định");
      } catch {
        return;
      }
    },
    [onUpdateRule],
  );

  const handleDiscard = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
      if (isInteractiveEventTarget(event.target)) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleRowActivate(id);
      }
    },
    [handleRowActivate],
  );

  const stopRowActivation = (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
  };

  const handleRequestDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>, id: string) => {
      event.stopPropagation();
      setConfirmDeleteId(id);
    },
    [],
  );

  const handleCancelDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setConfirmDeleteId(null);
    },
    [],
  );

  const handleConfirmDelete = useCallback(
    async (event: MouseEvent<HTMLButtonElement>, id: string) => {
      event.stopPropagation();

      try {
        await onDeleteRule(id);
        setSelectedId((current) => (current === id ? null : current));
      } catch {
        return;
      } finally {
        setConfirmDeleteId(null);
      }
    },
    [onDeleteRule],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-11 animate-pulse rounded-md border border-border-default bg-bg-secondary/50" />
        <div className="rounded-xl border border-border-default bg-bg-surface shadow-sm">
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-lg bg-bg-secondary/50"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-5 text-sm text-danger"
        role="alert"
      >
        <p>Không tải được danh sách quy định.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex rounded-md border border-danger/30 bg-bg-surface px-3 py-2 font-medium text-danger transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (rulePosts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface py-16 text-center">
        <p className="text-base font-medium text-text-primary">
          Chưa có bài quy định nào.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Tạo bài đầu tiên bằng nút thêm ở góc trên.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className="flex flex-col gap-1 rounded-md border border-border-default bg-bg-secondary/60 px-3 py-2 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
      >
        <span>
          <span className="font-medium text-text-primary">
            {rulePosts.length} quy định
          </span>
          , chọn một dòng để mở form điều chỉnh.
        </span>
        {selectedId ? (
          <span className="text-xs font-medium text-primary">
            Form đang mở dưới dòng được chọn
          </span>
        ) : null}
      </div>

      <div className="rounded-xl border border-border-default bg-bg-surface shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 tabular-nums">STT</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead className="min-w-[12rem]">Role tag</TableHead>
              <TableHead className="hidden min-w-[12rem] lg:table-cell">
                Tài nguyên
              </TableHead>
              <TableHead className="hidden min-w-[12rem] md:table-cell">
                Mô tả
              </TableHead>
              <TableHead className="w-[9rem] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rulePosts.map((post, index) => {
              const isSelected = selectedId === post.id;
              const isConfirmingDelete = confirmDeleteId === post.id;
              const isDeleting = deletingRuleId === post.id;
              return (
                <Fragment key={post.id}>
                  <TableRow
                    tabIndex={0}
                    aria-label={`Quy định: ${post.title}. ${
                      isSelected
                        ? "Nhấn để đóng form chỉnh sửa"
                        : "Nhấn để chỉnh sửa"
                    }`}
                    aria-selected={isSelected}
                    onClick={() => handleRowActivate(post.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, post.id)}
                    className={`cursor-pointer border-l-4 border-l-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset ${
                      isSelected
                        ? "border-l-primary bg-primary/8 hover:bg-primary/10"
                        : ""
                    }`}
                  >
                    <TableCell className="tabular-nums text-text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell className="max-w-[12rem] font-medium text-text-primary whitespace-normal sm:max-w-none">
                      {post.title}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <RegulationAudienceBadges audiences={post.audiences} />
                    </TableCell>
                    <TableCell className="hidden whitespace-normal lg:table-cell">
                      {post.resourceLink ? (
                        <RegulationResourceLink
                          resourceLink={post.resourceLink}
                          resourceLinkLabel={post.resourceLinkLabel}
                          className="text-xs"
                        />
                      ) : (
                        <span className="text-sm text-text-muted">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden max-w-xl text-text-secondary whitespace-normal md:table-cell">
                      {post.description
                        ? truncate(post.description, 120)
                        : "—"}
                    </TableCell>
                    <TableCell className="min-w-[9rem] text-right align-top">
                      {isConfirmingDelete ? (
                        <fieldset
                          className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0 sm:flex-row sm:justify-end"
                        >
                          <legend className="sr-only">
                            Xác nhận xóa quy định {post.title}
                          </legend>
                          <button
                            type="button"
                            onClick={(event) =>
                              handleConfirmDelete(event, post.id)
                            }
                            onKeyDown={stopRowActivation}
                            disabled={isDeleting}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-danger px-3 py-2 text-xs font-medium text-text-inverse transition-colors hover:bg-danger/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-50"
                          >
                            <CheckIcon className="size-4" aria-hidden="true" />
                            {isDeleting ? "Đang xóa…" : "Xác nhận"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            onKeyDown={stopRowActivation}
                            disabled={isDeleting}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-50"
                          >
                            <XMarkIcon className="size-4" aria-hidden="true" />
                            Hủy
                          </button>
                        </fieldset>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) =>
                            handleRequestDelete(event, post.id)
                          }
                          onKeyDown={stopRowActivation}
                          disabled={deletingRuleId !== null}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-danger/30 bg-bg-surface px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-50"
                          aria-label={`Xóa quy định ${post.title}`}
                          title="Xóa quy định"
                        >
                          <TrashIcon className="size-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Xóa</span>
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                  {isSelected ? (
                    <TableRow className="bg-primary/8 hover:bg-primary/8">
                      <TableCell colSpan={6} className="p-2 sm:p-4">
                        <div className="motion-panel-enter transform-gpu">
                          <RulePostEditTable
                            key={post.id}
                            rule={post}
                            onSave={(values) => handleSave(post.id, values)}
                            onDiscard={handleDiscard}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
