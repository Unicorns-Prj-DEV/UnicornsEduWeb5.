"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ClassScopedMakeupScheduleEventPayload, MakeupScheduleEventRecord } from "@/dtos/class-schedule.dto";
import type {
  CreateMissedTeachingExplanationPayload,
  MissedTeachingAlert,
  MissedTeachingExplanationRecord,
  UpdateMissedTeachingExplanationPayload,
} from "@/dtos/session.dto";
import { DateInput } from "@/components/ui/DateInput";
import { TimeInput } from "@/components/ui/TimeInput";
import ClassCard from "./ClassCard";

type AlertDraft = {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

type MissedTeachingAlertsCardProps = {
  alerts: MissedTeachingAlert[];
  canCreateMakeup?: boolean;
  createMakeupFn?: (
    classId: string,
    payload: ClassScopedMakeupScheduleEventPayload,
  ) => Promise<MakeupScheduleEventRecord>;
  saveExplanationFn?: (
    classId: string,
    payload: CreateMissedTeachingExplanationPayload,
  ) => Promise<MissedTeachingExplanationRecord>;
  updateExplanationFn?: (
    explanationId: string,
    payload: UpdateMissedTeachingExplanationPayload,
  ) => Promise<MissedTeachingExplanationRecord>;
  onChanged?: () => Promise<void> | void;
  getClassHref?: (classId: string) => string;
};

function getTodayDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

function createDefaultDraft(alert: MissedTeachingAlert): AlertDraft {
  return {
    date: getTodayDateValue(),
    startTime: formatTime(alert.scheduledStartTime),
    endTime: alert.scheduledEndTime
      ? formatTime(alert.scheduledEndTime)
      : formatTime(alert.scheduledStartTime),
    reason: alert.explanation?.reason ?? "",
  };
}

export default function MissedTeachingAlertsCard({
  alerts,
  canCreateMakeup = false,
  createMakeupFn,
  saveExplanationFn,
  updateExplanationFn,
  onChanged,
  getClassHref,
}: MissedTeachingAlertsCardProps) {
  const [drafts, setDrafts] = useState<Record<string, AlertDraft>>({});
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const visibleAlerts = useMemo(() => alerts.filter(Boolean), [alerts]);

  if (visibleAlerts.length === 0) {
    return null;
  }

  const updateDraft = (
    alert: MissedTeachingAlert,
    patch: Partial<AlertDraft>,
  ) => {
    setDrafts((current) => ({
      ...current,
      [alert.id]: {
        ...(current[alert.id] ?? createDefaultDraft(alert)),
        ...patch,
      },
    }));
  };

  const handleSaveExplanation = async (alert: MissedTeachingAlert) => {
    const draft = drafts[alert.id] ?? createDefaultDraft(alert);
    const reason = draft.reason.trim();
    if (!reason) {
      toast.error("Vui lòng nhập lý do giải trình.");
      return;
    }

    const actionKey = `explain:${alert.id}`;
    setSubmittingAction(actionKey);
    try {
      if (alert.status === "explained_pending_makeup" && alert.explanation?.id) {
        if (!updateExplanationFn) {
          toast.error("Không có quyền sửa giải trình.");
          return;
        }
        await updateExplanationFn(alert.explanation.id, { reason });
        toast.success("Đã cập nhật giải trình.");
      } else {
        if (!saveExplanationFn) {
          toast.error("Không có quyền lưu giải trình.");
          return;
        }
        await saveExplanationFn(alert.classId, {
          scheduleEntryId: alert.scheduleEntryId,
          originalDate: alert.originalDate,
          teacherId: alert.teacherId,
          reason,
        });
        toast.success("Đã lưu giải trình.");
      }

      await onChanged?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể lưu giải trình.";
      toast.error(message);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCreateMakeup = async (alert: MissedTeachingAlert) => {
    if (!createMakeupFn) {
      toast.error("Không có quyền tạo buổi bù.");
      return;
    }

    if (alert.status !== "explained_pending_makeup" || !alert.explanation?.id) {
      toast.error("Vui lòng lưu giải trình vắng trước khi xếp lịch bù.");
      return;
    }

    const draft = drafts[alert.id] ?? createDefaultDraft(alert);
    const actionKey = `makeup:${alert.id}`;
    setSubmittingAction(actionKey);
    try {
      await createMakeupFn(alert.classId, {
        teacherId: alert.teacherId,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        note: "",
        baselineScheduleEntryId: alert.scheduleEntryId,
        originalDate: alert.originalDate,
      });
      toast.success("Đã xếp lịch bù.");
      setDrafts((current) => {
        const next = { ...current };
        delete next[alert.id];
        return next;
      });
      await onChanged?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể xếp lịch bù.";
      toast.error(message);
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <ClassCard title="Cảnh báo chưa dạy" className="w-full border-warning/35 bg-warning/5">
      <div className="space-y-3">
        {visibleAlerts.map((alert) => {
          const draft = drafts[alert.id] ?? createDefaultDraft(alert);
          const isExplained = alert.status === "explained_pending_makeup";
          const canEditExplanation =
            !isExplained || (alert.explanation?.canEdit ?? false);
          const classLabel = getClassHref ? (
            <Link
              href={getClassHref(alert.classId)}
              className="font-semibold text-primary hover:text-primary-hover"
            >
              {alert.className}
            </Link>
          ) : (
            <span className="font-semibold text-text-primary">{alert.className}</span>
          );

          return (
            <article
              key={alert.id}
              className="rounded-lg border border-warning/25 bg-bg-surface px-3 py-3"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-text-primary">
                    {classLabel}
                    <span className="text-text-muted">·</span>
                    <span>{alert.teacherName ?? "Chưa rõ gia sư"}</span>
                    {isExplained ? (
                      <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                        Đã giải trình · chưa bù
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Buổi gốc {formatDateLabel(alert.originalDate)} ·{" "}
                    {formatTime(alert.scheduledStartTime)}
                    {alert.scheduledEndTime ? `-${formatTime(alert.scheduledEndTime)}` : ""}
                  </div>
                  {isExplained && alert.explanation && !canCreateMakeup ? (
                    <div className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary">
                      <p className="text-xs font-medium text-text-secondary">Lý do giải trình</p>
                      <p className="mt-1 whitespace-pre-wrap">{alert.explanation.reason}</p>
                    </div>
                  ) : null}
                </div>

                {canCreateMakeup ? (
                  <div className="space-y-2">
                    <textarea
                      value={draft.reason}
                      onChange={(event) =>
                        updateDraft(alert, { reason: event.target.value })
                      }
                      placeholder="Lý do giải trình"
                      readOnly={!canEditExplanation}
                      className="min-h-20 w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-border-focus focus:ring-2 focus:ring-border-focus/25 read-only:cursor-default read-only:opacity-80"
                      required
                    />
                    {canEditExplanation ? (
                      <button
                        type="button"
                        onClick={() => handleSaveExplanation(alert)}
                        disabled={submittingAction === `explain:${alert.id}`}
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submittingAction === `explain:${alert.id}`
                          ? "Đang lưu..."
                          : isExplained
                            ? "Lưu thay đổi giải trình"
                            : "Lưu giải trình"}
                      </button>
                    ) : null}

                    <div className="grid gap-2 sm:grid-cols-[1fr_0.8fr_0.8fr]">
                      <DateInput
                        value={draft.date}
                        onChange={(event) => updateDraft(alert, { date: event.target.value })}
                        className="min-h-10 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-border-focus focus:ring-2 focus:ring-border-focus/25"
                        aria-label="Ngày học bù"
                      />
                      <TimeInput
                        value={draft.startTime}
                        onChange={(event) =>
                          updateDraft(alert, { startTime: event.target.value })
                        }
                        className="min-h-10 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-border-focus focus:ring-2 focus:ring-border-focus/25"
                        aria-label="Giờ bắt đầu học bù"
                      />
                      <TimeInput
                        value={draft.endTime}
                        onChange={(event) => updateDraft(alert, { endTime: event.target.value })}
                        className="min-h-10 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition focus:border-border-focus focus:ring-2 focus:ring-border-focus/25"
                        aria-label="Giờ kết thúc học bù"
                      />
                      <button
                        type="button"
                        onClick={() => handleCreateMakeup(alert)}
                        disabled={submittingAction === `makeup:${alert.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-3"
                      >
                        {submittingAction === `makeup:${alert.id}` ? "Đang xếp..." : "Xếp lịch bù"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </ClassCard>
  );
}
