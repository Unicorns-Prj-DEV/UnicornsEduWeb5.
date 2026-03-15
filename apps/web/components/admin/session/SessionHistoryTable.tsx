"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SessionItem } from "@/dtos/session.dto";
import { sanitizeHtml } from "@/lib/sanitize";
import RichTextEditor from "@/components/ui/RichTextEditor";
import * as sessionApi from "@/lib/apis/session.api";

type SessionEntityMode = "teacher" | "class" | "none";
type SessionStatusMode = "payment" | "timeline";

type Props = {
  sessions: SessionItem[];
  entityMode?: SessionEntityMode;
  statusMode?: SessionStatusMode;
  emptyText?: string;
  className?: string;
  onSessionUpdated?: () => void;
};

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractDateKey(raw?: string | null): string | null {
  if (!raw) return null;

  const matched = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (matched) return matched[1];

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateKey(date);
}

function formatDateOnly(raw?: string | null): string {
  const dateKey = extractDateKey(raw);
  if (dateKey) {
    const [, year, month, day] = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

  return "—";
}

function formatTimeOnly(raw?: string | null): string {
  if (!raw) return "—";

  const directMatch = raw.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (directMatch) {
    return `${directMatch[1]}:${directMatch[2]}`;
  }

  const isoMatch = raw.trim().match(/T(\d{2}:\d{2})(?::\d{2})?/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function renderSessionTime(session: SessionItem): string {
  const start = formatTimeOnly(session.startTime ?? null);
  const end = formatTimeOnly(session.endTime ?? null);

  if (start === "—" && end === "—") {
    return "—";
  }

  if (start !== "—" && end !== "—") {
    return `${start} – ${end}`;
  }

  return start !== "—" ? start : end;
}

function renderSessionStatus(
  session: SessionItem,
  statusMode: SessionStatusMode,
): { label: string; className: string } {
  if (statusMode === "timeline") {
    const sessionDateKey = extractDateKey(session.date);
    if (!sessionDateKey) {
      return {
        label: "Chưa xác định",
        className: "bg-text-muted/15 text-text-muted",
      };
    }

    const todayDateKey = formatDateKey(new Date());
    if (sessionDateKey <= todayDateKey) {
      return {
        label: "Đã hoàn thành",
        className: "bg-success/15 text-success",
      };
    }

    return {
      label: "Đã lên lịch",
      className: "bg-warning/15 text-warning",
    };
  }

  const paymentStatus = (session.teacherPaymentStatus ?? "").toLowerCase();
  if (paymentStatus === "paid") {
    return {
      label: "Đã thanh toán",
      className: "bg-success/15 text-success",
    };
  }

  if (paymentStatus === "unpaid" || paymentStatus === "") {
    return {
      label: "Chưa thanh toán",
      className: "bg-warning/15 text-warning",
    };
  }

  return {
    label: paymentStatus,
    className: "bg-text-muted/15 text-text-muted",
  };
}

function renderEntityCell(session: SessionItem, entityMode: SessionEntityMode): string {
  if (entityMode === "teacher") {
    return session.teacher?.fullName?.trim() || "—";
  }

  if (entityMode === "class") {
    return session.class?.name?.trim() || "—";
  }

  return "—";
}

function renderEntityHeader(entityMode: SessionEntityMode): string {
  if (entityMode === "teacher") {
    return "Gia sư";
  }

  if (entityMode === "class") {
    return "Lớp";
  }

  return "";
}

export default function SessionHistoryTable({
  sessions,
  entityMode = "none",
  statusMode = "payment",
  emptyText = "Chưa có buổi học nào.",
  className = "",
  onSessionUpdated,
}: Props) {
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      sessionApi.updateSession(id, { notes: notes || null }),
    onSuccess: () => {
      toast.success("Đã cập nhật ghi chú buổi học.");
      setEditingSession(null);
      onSessionUpdated?.();
    },
    onError: () => {
      toast.error("Không thể cập nhật ghi chú. Vui lòng thử lại.");
    },
  });

  const openEdit = (session: SessionItem) => {
    setEditingSession(session);
    setEditNotes(session.notes ?? "");
  };

  const closeEdit = () => {
    setEditingSession(null);
  };

  const handleSaveEdit = () => {
    if (!editingSession) return;
    updateMutation.mutate({ id: editingSession.id, notes: editNotes });
  };

  const shouldShowEntity = entityMode !== "none";

  return (
    <>
      <div className={`overflow-x-auto ${className}`}>
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <caption className="sr-only">Lịch sử buổi học</caption>
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th scope="col" className={`w-[${entityMode === "teacher" ? "10%" : "25%"}] px-4 py-3 font-medium text-text-primary`}>
                Ngày học
              </th>
              {
                entityMode === "teacher" ? <th scope="col" className="w-[30%] px-4 py-3 font-medium text-text-primary">Note</th> : null
              }
              <th scope="col" className={`w-[${entityMode === "teacher" ? "20%" : "25%"}] px-4 py-3 font-medium text-text-primary`}>
                Giờ học
              </th>
              <th scope="col" className={`w-[${entityMode === "teacher" ? "20%" : "25%"}] px-4 py-3 font-medium text-text-primary`}>
                {renderEntityHeader(entityMode)}
              </th>
              <th scope="col" className={`w-[${entityMode === "teacher" ? "20%" : "25%"}] px-4 py-3 font-medium text-text-primary`}>
                Trạng thái thanh toán
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.length > 0 ? sessions.map((session) => {
              const status = renderSessionStatus(session, statusMode);
              const notesContent = session.notes?.trim();
              const sanitizedNotes = notesContent ? sanitizeHtml(notesContent) : "";
              return (
                <tr
                  key={session.id}
                  className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                >
                  <td className="px-4 py-3 text-text-primary">{formatDateOnly(session.date)}</td>
                  {entityMode === "teacher" ? (
                    <td className="px-4 py-3 text-text-primary">
                      <div className="flex items-start gap-2">
                        {sanitizedNotes ? (
                          <div
                            className="min-w-0 flex-1 [&_p]:mb-1 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-bold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm"
                            dangerouslySetInnerHTML={{ __html: sanitizedNotes }}
                          />
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(session)}
                          className="shrink-0 rounded p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          aria-label="Sửa ghi chú"
                        >
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-mono text-text-primary">{renderSessionTime(session)}</td>
                  {shouldShowEntity ? (
                    <td className="px-4 py-3 text-text-primary">{renderEntityCell(session, entityMode)}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={entityMode === "teacher" ? 5 : shouldShowEntity ? 4 : 3} className="px-4 py-3 text-center text-text-muted">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingSession && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden
            onClick={closeEdit}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-session-notes-title"
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
          >
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 id="edit-session-notes-title" className="text-lg font-semibold text-text-primary">
                Sửa ghi chú buổi học
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Đóng"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-3 text-sm text-text-muted">
              {formatDateOnly(editingSession.date)} · {renderSessionTime(editingSession)}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RichTextEditor
                value={editNotes}
                onChange={setEditNotes}
                minHeight="min-h-[200px]"
              />
            </div>
            <div className="mt-4 flex shrink-0 justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
              >
                {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
