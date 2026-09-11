"use client";

import { useState } from "react";

import type { ClassTimelineItemDto } from "@/dtos/class-timeline.dto";
import MathContent from "@/components/ui/MathContent";
import { formatVnWeekday } from "@/lib/formatters";

type TimelineSession = NonNullable<ClassTimelineItemDto["session"]>;
type TimelineSurvey = NonNullable<ClassTimelineItemDto["survey"]>;

/** Nhãn tiếng Việt cho `AttendanceStatus` (present | excused | absent). */
export function attendanceStatusLabel(status: string | null): string | null {
  if (!status) return null;
  if (status === "present") return "Có mặt";
  if (status === "excused") return "Vắng có phép";
  if (status === "absent") return "Vắng mặt";
  return status;
}

function attendanceStatusClassName(status: string | null): string {
  if (status === "present") return "bg-success/10 text-success";
  if (status === "excused") return "bg-warning/10 text-warning";
  if (status === "absent") return "bg-danger/10 text-danger";
  return "bg-primary/10 text-primary";
}

function formatWeekday(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatVnWeekday(date);
}

function formatDateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

/** `startTime`/`endTime` từ API là chuỗi `HH:mm:ss`, cắt còn `HH:mm`. */
function formatTimeRange(
  startTime: string | null,
  endTime: string | null,
): string {
  const start = startTime?.slice(0, 5);
  const end = endTime?.slice(0, 5);
  if (start && end) return `${start} – ${end}`;
  return start || end || "—";
}

/** Nút thu gọn/mở rộng dùng chung; chặn click nổi lên row để không mở popup. */
function ExpandToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="mt-1 text-[11px] font-medium text-primary hover:underline"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onToggle();
      }}
    >
      {expanded ? "Thu gọn" : "Xem thêm"}
    </button>
  );
}

function SessionField({
  label,
  content,
  expanded,
}: {
  label: string;
  content: string;
  expanded: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase text-text-muted">
        {label}
      </p>
      <MathContent
        content={content}
        className={`text-xs ${expanded ? "" : "line-clamp-1"}`}
      />
    </div>
  );
}

/**
 * Row buổi học trên timeline học sinh: thời gian + nội dung buổi + nhận xét
 * dành riêng cho chính em. Không hiện dữ liệu vận hành (hệ số, thanh toán gia
 * sư, trợ cấp) và không hiện điểm danh/nhận xét của bạn học khác.
 */
export function StudentSessionTimelineCard({
  session,
}: {
  session: TimelineSession;
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = [
    { label: "Nội dung", content: session.lessonContent },
    { label: "Bài tập", content: session.homework },
    { label: "Hướng dẫn", content: session.tutorial },
  ].filter((field) => Boolean(field.content?.trim()));
  const statusLabel = attendanceStatusLabel(session.myAttendanceStatus);
  const myNotes = session.myAttendanceNotes?.trim() ?? "";
  const canExpand = fields.length > 0 || Boolean(myNotes);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex min-w-[5.5rem] shrink-0 flex-col gap-0.5 text-left">
        <p className="text-xs leading-tight text-text-secondary">
          {formatWeekday(session.date)}:
        </p>
        <p className="text-sm font-bold leading-tight text-text-primary">
          {formatDateOnly(session.date)}
        </p>
        <p className="font-mono text-[11px] leading-tight text-text-muted">
          {formatTimeRange(session.startTime, session.endTime)}
        </p>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {fields.length ? (
          <div className="space-y-1.5">
            {fields.map((field) => (
              <SessionField
                key={field.label}
                label={field.label}
                content={field.content as string}
                expanded={expanded}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            Chưa có nội dung cho buổi học này.
          </p>
        )}

        {statusLabel || myNotes ? (
          <div className="flex flex-col gap-1 border-t border-border-subtle pt-2">
            {statusLabel ? (
              <span
                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${attendanceStatusClassName(
                  session.myAttendanceStatus,
                )}`}
              >
                {statusLabel}
              </span>
            ) : null}
            {myNotes ? (
              <MathContent
                content={myNotes}
                className={`text-xs ${expanded ? "" : "line-clamp-2"}`}
              />
            ) : null}
          </div>
        ) : null}

        {canExpand ? (
          <ExpandToggle
            expanded={expanded}
            onToggle={() => setExpanded((prev) => !prev)}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Row khảo sát trên timeline học sinh: tên bài + ngày báo cáo + nhận xét dành
 * riêng cho em. Đánh giá kiến thức chung của lớp chỉ dành cho staff.
 */
export function StudentSurveyTimelineCard({
  survey,
}: {
  survey: TimelineSurvey;
}) {
  const [expanded, setExpanded] = useState(false);
  const assessment = survey.myAssessment?.trim() ?? "";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-text-muted">
            Bài khảo sát
          </p>
          <p className="truncate text-sm font-semibold text-text-primary">
            {survey.surveyName?.trim() || "Báo cáo khảo sát"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase text-text-muted">
            Ngày báo cáo
          </p>
          <p className="text-sm text-text-primary">
            {formatDateOnly(survey.reportDate)}
          </p>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-2">
        {assessment ? (
          <>
            <MathContent
              content={assessment}
              className={`text-xs ${expanded ? "" : "line-clamp-3"}`}
            />
            <ExpandToggle
              expanded={expanded}
              onToggle={() => setExpanded((prev) => !prev)}
            />
          </>
        ) : (
          <p className="text-xs text-text-muted">
            Chưa có nhận xét dành cho em ở bài khảo sát này.
          </p>
        )}
      </div>
    </div>
  );
}
