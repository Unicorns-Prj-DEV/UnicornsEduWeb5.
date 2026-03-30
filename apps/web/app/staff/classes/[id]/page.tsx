"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ClassCard,
  ClassDetailRow,
  EditClassSchedulePopup,
  ScheduleTimeCard,
  SessionHistoryTableSkeleton,
  TutorCard,
} from "@/components/admin/class";
import AdminClassDetailPage from "@/app/admin/classes/[id]/page";
import AddSessionPopup from "@/components/admin/class/AddSessionPopup";
import SessionHistoryTable from "@/components/admin/session/SessionHistoryTable";
import MonthNav from "@/components/admin/MonthNav";
import type {
  ClassDetail,
  ClassScheduleItem,
  ClassStatus,
  ClassType,
} from "@/dtos/class.dto";
import type { SessionCreatePayload, SessionItem, SessionUpdatePayload } from "@/dtos/session.dto";
import { getFullProfile } from "@/lib/apis/auth.api";
import * as staffOpsApi from "@/lib/apis/staff-ops.api";

const STATUS_LABELS: Record<ClassStatus, string> = {
  running: "Đang chạy",
  ended: "Đã kết thúc",
};

const TYPE_LABELS: Record<ClassType, string> = {
  basic: "Basic",
  vip: "VIP",
  advance: "Advance",
  hardcore: "Hardcore",
};

function getCurrentMonthValue() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function getTeacherRole(profile?: Awaited<ReturnType<typeof getFullProfile>> | null) {
  return (profile?.staffInfo?.roles ?? []).includes("teacher");
}

const staffOpsKeys = {
  classList: () => ["staff-ops", "class", "list"] as const,
  classDetail: (classId: string) => ["staff-ops", "class", "detail", classId] as const,
  classSessions: (classId: string, year: string, month: string) =>
    ["staff-ops", "sessions", "class", classId, year, month] as const,
  updateSchedule: (classId: string) => ["staff-ops", "class", "schedule", "update", classId] as const,
  createSession: (classId: string) => ["staff-ops", "sessions", "create", classId] as const,
  updateSession: (classId: string) => ["staff-ops", "sessions", "update", classId] as const,
};

function toStaffCreateSessionPayload(payload: SessionCreatePayload) {
  return {
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    notes: payload.notes ?? null,
    coefficient: payload.coefficient,
    attendance: (payload.attendance ?? []).map((item) => ({
      studentId: item.studentId,
      status: item.status,
      notes: item.notes ?? null,
    })),
  };
}

function toStaffUpdateSessionPayload(payload: SessionUpdatePayload) {
  return {
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    notes: payload.notes ?? null,
    coefficient: payload.coefficient,
    attendance: payload.attendance?.map((item) => ({
      studentId: item.studentId,
      status: item.status,
      notes: item.notes ?? null,
    })),
  };
}

export default function StaffClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = typeof params?.id === "string" ? params.id : "";

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [schedulePopupOpen, setSchedulePopupOpen] = useState(false);
  const [addSessionPopupOpen, setAddSessionPopupOpen] = useState(false);
  const [monthPopupOpen, setMonthPopupOpen] = useState(false);

  const [selectedYear, selectedMonthValue] = selectedMonth.split("-");
  const classDetailQueryKey = useMemo(() => staffOpsKeys.classDetail(id), [id]);
  const sessionsQueryKey = useMemo(
    () => staffOpsKeys.classSessions(id, selectedYear, selectedMonthValue),
    [id, selectedMonthValue, selectedYear],
  );

  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });

  const isAdmin = profile?.roleType === "admin";
  const isTeacher = getTeacherRole(profile);
  const isAssistant =
    profile?.roleType === "staff" &&
    (profile.staffInfo?.roles ?? []).includes("assistant");
  const canAccessClassWorkspace = isAdmin || isTeacher;
  const actorStaffId = profile?.staffInfo?.id ?? "";

  const {
    data: classDetail,
    isLoading,
    isError,
  } = useQuery<ClassDetail>({
    queryKey: classDetailQueryKey,
    queryFn: () => staffOpsApi.getClassById(id),
    enabled: !!id && canAccessClassWorkspace,
    retry: false,
    staleTime: 30_000,
  });

  const {
    data: sessions = [],
    isLoading: isSessionsLoading,
    isError: isSessionsError,
  } = useQuery<SessionItem[]>({
    queryKey: sessionsQueryKey,
    queryFn: () =>
      staffOpsApi.getSessionsByClassId(id, {
        month: selectedMonthValue,
        year: selectedYear,
      }),
    enabled: !!id && canAccessClassWorkspace,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const scheduleItems = Array.isArray(classDetail?.schedule)
    ? classDetail.schedule.filter((item) => item?.from && item?.to)
    : [];

  const classStudents = classDetail?.students ?? [];
  const popupTeachers = (classDetail?.teachers ?? []).map((teacher) => ({
    id: teacher.id,
    fullName: teacher.fullName,
  }));
  const popupStudents = classStudents.map((student) => ({
    id: student.id,
    fullName: student.fullName,
    tuitionFee: student.effectiveTuitionPerSession ?? null,
  }));

  const teacherCount = classDetail?.teachers?.length ?? 0;
  const canManageSchedule = canAccessClassWorkspace;
  const teacherScopedSessionLabel = isAdmin ? "Buổi trong tháng" : "Buổi bạn dạy trong tháng";
  const teacherScopedHistoryTitle = isAdmin ? "Lịch sử buổi học" : "Lịch sử buổi học bạn dạy";
  const teacherScopedHistorySummary = isAdmin ? "Tổng số buổi" : "Tổng số buổi bạn dạy";
  const teacherScopedEmptyText = isAdmin
    ? "Không có buổi học trong tháng này."
    : "Bạn chưa dạy buổi nào trong tháng này.";
  const canCreateSession =
    classStudents.length > 0 &&
    (isTeacher ? Boolean(actorStaffId) : teacherCount === 1);
  const defaultTeacherId = isTeacher
    ? actorStaffId
    : teacherCount === 1
      ? classDetail?.teachers?.[0]?.id ?? ""
      : "";

  const invalidateClassOpsQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: classDetailQueryKey }),
      queryClient.invalidateQueries({ queryKey: staffOpsKeys.classList() }),
    ]);
  }, [classDetailQueryKey, queryClient]);

  const invalidateSessionQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
  }, [queryClient, sessionsQueryKey]);

  const getClassStudentsForEditor = useCallback(
    async (classId: string) => {
      if (classId !== id) return [];
      return popupStudents;
    },
    [id, popupStudents],
  );

  const updateScheduleMutation = useMutation({
    mutationKey: staffOpsKeys.updateSchedule(id),
    mutationFn: (payload: { schedule: ClassScheduleItem[] }) =>
      staffOpsApi.updateClassSchedule(id, payload),
    onSuccess: invalidateClassOpsQueries,
  });

  const createSessionMutation = useMutation({
    mutationKey: staffOpsKeys.createSession(id),
    mutationFn: (payload: SessionCreatePayload) =>
      staffOpsApi.createSession(id, toStaffCreateSessionPayload(payload)),
    onSuccess: invalidateSessionQueries,
  });

  const updateSessionMutation = useMutation({
    mutationKey: staffOpsKeys.updateSession(id),
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: SessionUpdatePayload;
    }) => staffOpsApi.updateSession(sessionId, toStaffUpdateSessionPayload(payload)),
    onSuccess: invalidateSessionQueries,
  });

  const handleScheduleSubmit = useCallback(
    (payload: { schedule: ClassScheduleItem[] }) => updateScheduleMutation.mutateAsync(payload),
    [updateScheduleMutation],
  );

  const handleCreateSession = useCallback(
    (payload: SessionCreatePayload) => createSessionMutation.mutateAsync(payload),
    [createSessionMutation],
  );

  const handleUpdateSession = useCallback(
    (sessionId: string, payload: SessionUpdatePayload) =>
      updateSessionMutation.mutateAsync({ sessionId, payload }),
    [updateSessionMutation],
  );

  if (isAssistant) {
    return <AdminClassDetailPage />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6" aria-busy="true" aria-live="polite">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
        <div className="mb-6 h-8 w-72 animate-pulse rounded bg-bg-tertiary" />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-bg-tertiary" />
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="rounded-lg border border-border-default bg-bg-surface p-4">
            <div className="mb-4 h-5 w-28 animate-pulse rounded bg-bg-tertiary" />
            <div className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
              <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border-default bg-bg-surface p-4">
          <div className="mb-4 h-5 w-36 animate-pulse rounded bg-bg-tertiary" />
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
            <div className="h-10 w-full animate-pulse rounded bg-bg-tertiary" />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border-default bg-bg-surface p-4">
          <div className="mb-4 h-5 w-56 animate-pulse rounded bg-bg-tertiary" />
          <SessionHistoryTableSkeleton rows={1} entityMode="teacher" showActionsColumn />
        </div>
      </div>
    );
  }

  if (!id || !canAccessClassWorkspace || isError || !classDetail) {
    const message = !id
      ? "Thiếu mã lớp học."
      : !canAccessClassWorkspace
        ? "Tài khoản hiện tại không có quyền mở workspace lớp học."
        : "Không tìm thấy lớp học hoặc bạn chưa được phân công lớp này.";

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:min-h-0 sm:min-w-0 sm:px-0"
        >
          <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Quay lại danh sách lớp</span>
        </button>
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
          <p>{message}</p>
        </div>
      </div>
    );
  }

  const statusChipClass =
    classDetail.status === "running"
      ? "bg-warning/15 text-warning"
      : "bg-text-muted/15 text-text-muted";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:min-h-0 sm:min-w-0 sm:px-0"
      >
        <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Quay lại danh sách lớp</span>
      </button>

      <header className="mb-5 flex flex-col gap-4 sm:mb-6">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="relative flex shrink-0">
            <div
              className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-bg-tertiary text-xl font-semibold text-text-primary ring-2 ring-border-default sm:size-16 sm:text-2xl"
              aria-hidden
            >
              {(classDetail.name?.trim() || "L").charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute bottom-0 right-0 block size-3 rounded-full border-2 border-bg-surface ${classDetail.status === "running" ? "bg-warning" : "bg-text-muted"
                }`}
              title={STATUS_LABELS[classDetail.status]}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 truncate text-lg font-semibold text-text-primary sm:text-xl">
                {classDetail.name?.trim() || "Lớp học"}
              </h1>
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {isAdmin ? "Staff Workspace" : "Teacher Workspace"}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {isAdmin
                ? "Admin đang xem route này theo chế độ teacher workspace. Bạn có thể hỗ trợ chỉnh khung giờ và thao tác buổi học, trong khi các trường về trợ cấp, học phí học sinh và cấu hình tài chính vẫn bị khóa."
                : "Bạn có thể chỉnh khung giờ, thêm buổi học, cập nhật ngày giờ, ghi chú và điểm danh cho lớp này. Các trường về trợ cấp, học phí học sinh và cấu hình tài chính tiếp tục bị khóa."}
            </p>
          </div>
        </div>
      </header>

      <EditClassSchedulePopup
        open={schedulePopupOpen}
        onClose={() => setSchedulePopupOpen(false)}
        classDetail={classDetail}
        onSubmitSchedule={handleScheduleSubmit}
      />

      {addSessionPopupOpen ? (
        <AddSessionPopup
          open={addSessionPopupOpen}
          classId={id}
          defaultTeacherId={defaultTeacherId}
          teachers={popupTeachers}
          students={popupStudents}
          teacherMode="readOnly"
          allowFinancialFields={false}
          allowCoefficientField
          createSessionFn={handleCreateSession}
          onClose={() => setAddSessionPopupOpen(false)}
        />
      ) : null}

      <div className="flex flex-col gap-4">
        <ClassCard title="Thông tin cơ bản" className="w-full">
          <dl className="divide-y divide-border-subtle">
            <ClassDetailRow
              label="Trạng thái"
              value={<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass}`}>{STATUS_LABELS[classDetail.status]}</span>}
            />
            <ClassDetailRow
              label="Phân loại"
              value={
                <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {TYPE_LABELS[classDetail.type] ?? classDetail.type}
                </span>
              }
            />
            <ClassDetailRow label="Sĩ số tối đa" value={classDetail.maxStudents ?? "—"} />
            <ClassDetailRow label="Số học sinh" value={classStudents.length} />
            <ClassDetailRow label="Gia sư phụ trách" value={teacherCount} />
            <ClassDetailRow label={teacherScopedSessionLabel} value={sessions.length} />
          </dl>
        </ClassCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <TutorCard
            teachers={classDetail.teachers}
            className="flex-1"
            enableTeacherNavigation={false}
            action={
              <div className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary sm:min-h-0 sm:w-auto">
                Chỉ xem
              </div>
            }
          />
          <ClassCard
            className="flex-1"
            title="Khung giờ học"
            action={
              canManageSchedule ? (
                <button
                  type="button"
                  onClick={() => setSchedulePopupOpen(true)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:w-auto"
                >
                  Chỉnh sửa
                </button>
              ) : null
            }
          >
            {scheduleItems.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {scheduleItems.map((item, index) => (
                  <ScheduleTimeCard
                    key={`${item.from}-${item.to}-${index}`}
                    index={index + 1}
                    from={item.from}
                    to={item.to}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/50 px-4 py-6 text-center text-sm text-text-muted">
                Chưa có khung giờ học.
              </div>
            )}
          </ClassCard>
        </div>

        <ClassCard title="Danh sách học sinh" className="w-full">
          <div className="overflow-x-auto">
            <div className="space-y-3 md:hidden">
              {classStudents.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-muted">Lớp chưa có học sinh.</p>
              ) : (
                classStudents.map((student) => {
                  const studentStatus = student.status ?? "active";
                  const isActive = studentStatus === "active";
                  const statusLabel = isActive ? "Đang học" : "Ngưng học";

                  return (
                    <article
                      key={student.id}
                      className="rounded-lg border border-border-default bg-bg-surface p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{student.fullName}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive
                              ? "bg-success/15 text-success"
                              : "bg-text-muted/15 text-text-muted"
                            }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <table className="hidden w-full min-w-[560px] border-collapse text-left text-sm md:table">
              <caption className="sr-only">Danh sách học sinh trong lớp</caption>
              <thead>
                <tr className="border-b border-border-default bg-bg-secondary">
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Họ tên
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {classStudents.length === 0 ? (
                  <tr className="border-b border-border-default bg-bg-surface">
                    <td className="px-4 py-6 text-center text-sm text-text-muted" colSpan={2}>
                      Lớp chưa có học sinh.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((student) => {
                    const studentStatus = student.status ?? "active";
                    const isActive = studentStatus === "active";
                    const statusLabel = isActive ? "Đang học" : "Ngưng học";

                    return (
                      <tr
                        key={student.id}
                        className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                      >
                        <td className="px-4 py-3 text-text-primary">{student.fullName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive
                                ? "bg-success/15 text-success"
                                : "bg-text-muted/15 text-text-muted"
                              }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ClassCard>

        <ClassCard title={teacherScopedHistoryTitle} className="w-full">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="inline-flex w-fit items-center rounded-full bg-bg-secondary px-3 py-1 text-xs text-text-muted sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm">
              {teacherScopedHistorySummary}: {sessions.length}
            </div>
            <div
              data-session-month-nav
              className="relative grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:w-auto sm:justify-start"
            >
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                title="Tháng trước"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary transition-all duration-200 hover:border-primary hover:bg-bg-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-8 sm:min-w-8 sm:rounded-md sm:px-2 sm:py-1"
                aria-label="Tháng trước"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => setMonthPopupOpen(!monthPopupOpen)}
                title="Chọn tháng/năm"
                className="flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:rounded-md sm:border-none sm:bg-transparent sm:px-2 sm:py-1"
                aria-expanded={monthPopupOpen}
                aria-haspopup="dialog"
              >
                <span className="whitespace-nowrap">{monthLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                title="Tháng sau"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary transition-all duration-200 hover:border-primary hover:bg-bg-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-8 sm:min-w-8 sm:rounded-md sm:px-2 sm:py-1"
                aria-label="Tháng sau"
              >
                ▶
              </button>
              {monthPopupOpen ? (
                <div
                  role="dialog"
                  aria-label="Chọn tháng"
                  className="absolute left-0 top-full z-30 mt-2 w-full rounded-xl border border-border-default bg-bg-surface p-3 shadow-md sm:left-1/2 sm:min-w-[200px] sm:w-auto sm:-translate-x-1/2 sm:rounded-md sm:p-2"
                >
                  + Thêm buổi học
                </button>
              }
            />
          </div>

          {!canCreateSession ? (
            <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              {classStudents.length === 0
                ? "Lớp chưa có học sinh nên chưa thể tạo buổi học."
                : "Cần đúng 1 gia sư được phân công để admin tạo buổi học từ route này."}
            </div>
          ) : null}

          {isSessionsLoading ? (
            <SessionHistoryTableSkeleton rows={5} entityMode="teacher" showActionsColumn />
          ) : (
            <SessionHistoryTable
              sessions={sessions}
              entityMode="teacher"
              statusMode="payment"
              emptyText={teacherScopedEmptyText}
              editorLayout="wide"
              showActionsColumn
              teachers={popupTeachers}
              getClassStudents={getClassStudentsForEditor}
              allowTeacherSelection={false}
              allowFinancialEdits={false}
              allowCoefficientEdit
              allowPaymentStatusEdit={false}
              allowDeleteSession={false}
              updateSessionFn={handleUpdateSession}
            />
          )}
          {isSessionsError ? (
            <p className="mt-3 text-sm text-error">Không tải được lịch sử buổi học.</p>
          ) : null}
        </ClassCard>
      </div>
    </div>
  );
}
