"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import * as sessionApi from "@/lib/apis/session.api";
import { formatCurrency } from "@/lib/class.helpers";
import {
  ClassCard,
  ClassDetailRow,
  EditClassBasicInfoPopup,
  EditClassSchedulePopup,
  EditClassStudentsPopup,
  EditClassTeachersPopup,
  ScheduleTimeCard,
  SessionHistoryTableSkeleton,
  TutorCard,
} from "@/components/admin/class";
import AddSessionPopup from "@/components/admin/class/AddSessionPopup";
import SessionHistoryTable from "@/components/admin/session/SessionHistoryTable";
import MonthNav from "@/components/admin/MonthNav";
import { ClassStatus, ClassType, ClassDetail, ClassStudent } from "@/dtos/class.dto";
import { SessionItem } from "@/dtos/session.dto";
import {
  buildAdminLikePath,
  resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";

/** Mock surveys – nhiều tháng để test chuyển tháng */
const MOCK_SURVEYS = [
  { id: "sv1", date: "2025-02-15", studentName: "Nguyễn Văn A", rating: 5, note: "Buổi học tốt" },
  { id: "sv2", date: "2025-03-01", studentName: "Nguyễn Văn A", rating: 5, note: "Buổi học tốt" },
  { id: "sv3", date: "2025-03-05", studentName: "Trần Thị B", rating: 4, note: "Nội dung rõ ràng" },
  { id: "sv4", date: "2025-04-02", studentName: "Lê Văn C", rating: 5, note: "Rất hài lòng" },
];

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

type TabId = "sessions" | "surveys";
const TAB_INDICATOR_TRANSITION: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};
const TAB_PANEL_TRANSITION: Transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

function getStudentPackageSummary(
  student: ClassStudent,
): string | null {
  const effectivePackageTotal = student.effectiveTuitionPackageTotal;
  const effectivePackageSession = student.effectiveTuitionPackageSession;

  if (effectivePackageTotal == null && effectivePackageSession == null) {
    return null;
  }

  return `${formatCurrency(effectivePackageTotal)} / ${effectivePackageSession ?? "—"} buổi`;
}

function getStudentEffectiveTuitionPerSession(student: ClassStudent): number {
  return typeof student.effectiveTuitionPerSession === "number" &&
    Number.isFinite(student.effectiveTuitionPerSession)
    ? student.effectiveTuitionPerSession
    : 0;
}

export default function AdminClassDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const pathname = usePathname();
  const routeBase = resolveAdminLikeRouteBase(pathname);
  const prefersReducedMotion = useReducedMotion();
  const [basicInfoPopupOpen, setBasicInfoPopupOpen] = useState(false);
  const [teachersPopupOpen, setTeachersPopupOpen] = useState(false);
  const [schedulePopupOpen, setSchedulePopupOpen] = useState(false);
  const [studentsPopupOpen, setStudentsPopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("sessions");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [monthPopupOpen, setMonthPopupOpen] = useState(false);
  const [addSessionPopupOpen, setAddSessionPopupOpen] = useState(false);

  const surveysInMonth = useMemo(() => {
    return MOCK_SURVEYS.filter((s) => s.date.startsWith(selectedMonth));
  }, [selectedMonth]);

  const [selectedYear, selectedMonthValue] = selectedMonth.split("-");
  const indicatorTransition = prefersReducedMotion
    ? { duration: 0 }
    : TAB_INDICATOR_TRANSITION;
  const panelMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: TAB_PANEL_TRANSITION,
      };

  const {
    data: classDetail,
    isLoading,
    isError,
  } = useQuery<ClassDetail>({
    queryKey: ["class", "detail", id],
    queryFn: () => classApi.getClassById(id),
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const {
    data: sessionsInMonth = [],
    isLoading: isSessionsLoading,
    isError: isSessionsError,
  } = useQuery<SessionItem[]>({
    queryKey: ["sessions", "class", id, selectedYear, selectedMonthValue],
    queryFn: () =>
      sessionApi.getSessionsByClassId(id, {
        month: selectedMonthValue,
        year: selectedYear,
      }),
    enabled: !!id,
  });

  const handleSessionUpdated = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["sessions", "class", id, selectedYear, selectedMonthValue],
    });
  }, [queryClient, id, selectedYear, selectedMonthValue]);

  const scheduleItems = Array.isArray(classDetail?.schedule)
    ? classDetail.schedule.filter((item) => item?.from && item?.to)
    : [];

  const classStudents = useMemo(() => classDetail?.students ?? [], [classDetail?.students]);
  const totalSessionTuition = classDetail?.sessionTuitionTotal ?? 0;

  const popupTeachers = useMemo(
    () =>
      (classDetail?.teachers ?? []).map((teacher) => ({
        id: teacher.id,
        fullName: teacher.fullName,
      })),
    [classDetail?.teachers],
  );
  const currentClassTeacherId = popupTeachers.length === 1 ? popupTeachers[0]?.id : undefined;
  const addSessionTeacherMode = popupTeachers.length === 1 ? "readOnly" : "select";

  const popupStudents = useMemo(
    () =>
      classStudents.map((student) => ({
        id: student.id,
        fullName: student.fullName,
        tuitionFee: getStudentEffectiveTuitionPerSession(student),
      })),
    [classStudents],
  );

  const getClassStudents = useCallback(
    async (classId: string) => {
      if (classId !== id) return [];
      return classStudents.map((student) => ({
        id: student.id,
        fullName: student.fullName,
        tuitionFee: getStudentEffectiveTuitionPerSession(student),
      }));
    },
    [id, classStudents],
  );

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

  if (!id || isError || !classDetail) {
    const message = !id ? "Thiếu mã lớp học." : "Không tìm thấy lớp học.";

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

  const tuitionPackageLabel =
    classDetail.tuitionPackageTotal != null || classDetail.tuitionPackageSession != null
      ? `${formatCurrency(classDetail.tuitionPackageTotal)} / ${classDetail.tuitionPackageSession ?? "—"} buổi`
      : "—";

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
              className={`absolute bottom-0 right-0 block size-3 rounded-full border-2 border-bg-surface ${classDetail.status === "running" ? "bg-success" : "bg-error"}`}
              title={STATUS_LABELS[classDetail.status]}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 truncate text-lg font-semibold text-text-primary sm:text-xl">
                {classDetail.name?.trim() || "Lớp học"}
              </h1>
              <button
                type="button"
                onClick={() => setBasicInfoPopupOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted transition hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:size-8"
                aria-label="Chỉnh sửa thông tin cơ bản lớp học"
                title="Chỉnh sửa thông tin cơ bản"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              Chi tiết lớp học và vận hành theo buổi.
            </p>
          </div>
        </div>
      </header>

      <EditClassBasicInfoPopup
        open={basicInfoPopupOpen}
        onClose={() => setBasicInfoPopupOpen(false)}
        classDetail={classDetail}
      />
      <EditClassTeachersPopup
        open={teachersPopupOpen}
        onClose={() => setTeachersPopupOpen(false)}
        classDetail={classDetail}
      />
      <EditClassSchedulePopup
        open={schedulePopupOpen}
        onClose={() => setSchedulePopupOpen(false)}
        classDetail={classDetail}
      />
      <EditClassStudentsPopup
        open={studentsPopupOpen}
        onClose={() => setStudentsPopupOpen(false)}
        classDetail={classDetail}
      />

      {addSessionPopupOpen ? (
        <AddSessionPopup
          open={addSessionPopupOpen}
          classId={id}
          defaultTeacherId={currentClassTeacherId}
          teachers={popupTeachers}
          students={popupStudents}
          sessionTuitionTotal={totalSessionTuition}
          teacherMode={addSessionTeacherMode}
          onClose={() => setAddSessionPopupOpen(false)}
        />
      ) : null}

      <div className="flex flex-col gap-4">
        <ClassCard title="Thông tin cơ bản" className="w-full">
          <dl className="divide-y divide-border-subtle">
            <ClassDetailRow
              label="Trạng thái"
              value={
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass}`}>
                  {STATUS_LABELS[classDetail.status]}
                </span>
              }
            />
            <ClassDetailRow
              label="Phân loại"
              value={
                <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {TYPE_LABELS[classDetail.type] ?? classDetail.type}
                </span>
              }
            />
            <ClassDetailRow label="Gói học phí" value={tuitionPackageLabel} />
            <ClassDetailRow
              label="Trợ cấp/HV/buổi"
              value={
                <span className="font-semibold text-primary">
                  {formatCurrency(classDetail.allowancePerSessionPerStudent)}
                </span>
              }
            />
            <ClassDetailRow label="Sĩ số tối đa" value={classDetail.maxStudents ?? "—"} />
            <ClassDetailRow label="Scales" value={classDetail.scaleAmount ?? "—"} />
          </dl>
        </ClassCard>

        {/* Row 1: Gia sư phụ trách (trái) | Khung giờ học (phải) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TutorCard
            teachers={classDetail.teachers}
            className="flex-1"
            action={
              <button
                type="button"
                onClick={() => setTeachersPopupOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:w-auto"
              >
                Chỉnh sửa
              </button>
            }
          />
          <ClassCard
            className="flex-1"
            title="Khung giờ học"
            action={
              <button
                type="button"
                onClick={() => setSchedulePopupOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:w-auto"
              >
                Chỉnh sửa
              </button>
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

        {/* Row 2: Danh sách học sinh */}
        <ClassCard
          title="Danh sách học sinh"
          className="w-full"
          action={
            <button
              type="button"
              onClick={() => setStudentsPopupOpen(true)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0 sm:w-auto"
            >
              Chỉnh sửa
            </button>
          }
        >
          <div className="overflow-x-auto">
            {/* Mobile: danh sách học sinh dạng thẻ */}
            <div className="space-y-3 md:hidden">
              {classStudents.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-muted">
                  Lớp chưa có học sinh.
                </p>
              ) : (
                classStudents.map((student) => {
                  const studentStatus = student.status ?? "active";
                  const isActive = studentStatus === "active";
                  const statusLabel = isActive ? "Đang học" : "Ngưng học";
                  const packageSummary = getStudentPackageSummary(
                    student,
                  );

                  return (
                    <article
                      key={student.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        router.push(
                          buildAdminLikePath(
                            routeBase,
                            `students/${encodeURIComponent(student.id)}`,
                          ),
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(
                            buildAdminLikePath(
                              routeBase,
                              `students/${encodeURIComponent(student.id)}`,
                            ),
                          );
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-border-default bg-bg-surface p-3 shadow-sm transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {student.fullName}
                          </p>
                          {packageSummary ? (
                            <p className="mt-1 text-xs font-medium text-primary">
                              {packageSummary}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive
                              ? "bg-success/15 text-success"
                              : "bg-error/15 text-error"
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

            {/* Desktop / tablet: bảng học sinh */}
            <table className="hidden w-full min-w-[560px] border-collapse text-left text-sm md:table">
              <caption className="sr-only">Danh sách học sinh trong lớp</caption>
              <thead>
                <tr className="border-b border-border-default bg-bg-secondary">
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Họ tên
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Gói học phí
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {classStudents.length === 0 ? (
                  <tr className="border-b border-border-default bg-bg-surface">
                    <td className="px-4 py-6 text-center text-sm text-text-muted" colSpan={3}>
                      Lớp chưa có học sinh.
                    </td>
                  </tr>
                ) : (
                  classStudents.map((student) => {
                    const studentStatus = student.status ?? "active";
                    const isActive = studentStatus === "active";
                    const statusLabel = isActive ? "Đang học" : "Ngưng học";
                    const packageSummary = getStudentPackageSummary(
                      student,
                    );

                    return (
                      <tr
                        key={student.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          router.push(
                            buildAdminLikePath(
                              routeBase,
                              `students/${encodeURIComponent(student.id)}`,
                            ),
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(
                              buildAdminLikePath(
                                routeBase,
                                `students/${encodeURIComponent(student.id)}`,
                              ),
                            );
                          }
                        }}
                        className="cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        <td className="px-4 py-3 text-text-primary">{student.fullName}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {packageSummary ? (
                            <span className="font-medium text-primary">{packageSummary}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive
                                ? "bg-success/15 text-success"
                                : "bg-error/15 text-error"
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

        {/* Row 3: Lịch sử buổi học và khảo sát – 2 tab */}
        <ClassCard title="Lịch sử & Khảo sát" className="w-full">
          <div className="mb-4 flex flex-col gap-4">
            <div
              className="inline-flex w-fit items-center border-b border-border-default"
              role="tablist"
              aria-label="Lịch sử hoặc khảo sát"
            >
              <button
                id="class-detail-tab-sessions"
                type="button"
                role="tab"
                aria-selected={activeTab === "sessions"}
                aria-controls="class-detail-panel-sessions"
                onClick={() => setActiveTab("sessions")}
                className={`relative -mb-px px-4 py-2 text-sm font-semibold touch-manipulation transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${
                  activeTab === "sessions"
                    ? "text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {activeTab === "sessions" ? (
                  <motion.span
                    layoutId="class-detail-tab-underline"
                    aria-hidden
                    className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary"
                    transition={indicatorTransition}
                  />
                ) : null}
                Lịch sử buổi học
              </button>
              <button
                id="class-detail-tab-surveys"
                type="button"
                role="tab"
                aria-selected={activeTab === "surveys"}
                aria-controls="class-detail-panel-surveys"
                onClick={() => setActiveTab("surveys")}
                className={`relative -mb-px px-4 py-2 text-sm font-semibold touch-manipulation transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${
                  activeTab === "surveys"
                    ? "text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {activeTab === "surveys" ? (
                  <motion.span
                    layoutId="class-detail-tab-underline"
                    aria-hidden
                    className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary"
                    transition={indicatorTransition}
                  />
                ) : null}
                Khảo sát
              </button>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border-default bg-bg-secondary/55 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <MonthNav
                value={selectedMonth}
                onChange={setSelectedMonth}
                monthPopupOpen={monthPopupOpen}
                setMonthPopupOpen={setMonthPopupOpen}
                countLabel={
                  activeTab === "sessions"
                    ? `Tổng số buổi: ${sessionsInMonth.length}`
                    : `Tổng khảo sát: ${surveysInMonth.length}`
                }
                actionButton={
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === "sessions") {
                        setAddSessionPopupOpen(true);
                        return;
                      }
                      toast.info("Chức năng thêm khảo sát đang phát triển.");
                    }}
                    aria-label={activeTab === "sessions" ? "Thêm buổi học" : "Thêm khảo sát"}
                    title={activeTab === "sessions" ? "Thêm buổi học" : "Thêm khảo sát"}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                  >
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="sr-only">
                      {activeTab === "sessions" ? "Thêm buổi học" : "Thêm khảo sát"}
                    </span>
                  </button>
                }
              />
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "sessions" ? (
            <motion.section
              key="sessions"
              id="class-detail-panel-sessions"
              role="tabpanel"
              aria-labelledby="class-detail-tab-sessions"
              className="min-w-0"
              {...panelMotionProps}
            >
              {isSessionsLoading ? (
                <SessionHistoryTableSkeleton rows={5} entityMode="teacher" showActionsColumn />
              ) : (
                <SessionHistoryTable
                  sessions={sessionsInMonth}
                  entityMode="teacher"
                  variant="classDetail"
                  emptyText="Không có buổi học trong tháng này."
                  editorLayout="wide"
                  enableBulkPaymentStatusEdit
                  onSessionUpdated={handleSessionUpdated}
                  teachers={popupTeachers}
                  getClassStudents={getClassStudents}
                  sessionTuitionTotal={totalSessionTuition}
                />
              )}
              {isSessionsError ? (
                <p className="mt-3 text-sm text-error" role="alert">
                  Không tải được lịch sử buổi học.
                </p>
              ) : null}
            </motion.section>
          ) : (
            <motion.section
              key="surveys"
              id="class-detail-panel-surveys"
              role="tabpanel"
              aria-labelledby="class-detail-tab-surveys"
              className="min-w-0"
              {...panelMotionProps}
            >
            <div className="overflow-x-auto">
              {/* Mobile: khảo sát dạng thẻ */}
              <div className="md:hidden">
                {surveysInMonth.length === 0 ? (
                  <p className="py-6 text-center text-sm text-text-muted">
                    Không có khảo sát trong tháng này.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {surveysInMonth.map((sv) => (
                      <article
                        key={sv.id}
                        className="rounded-lg border border-border-default bg-bg-surface p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                              Ngày
                            </p>
                            <p className="text-sm font-semibold text-text-primary">{sv.date}</p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-text-muted">
                              Học viên
                            </p>
                            <p className="text-sm text-text-primary">{sv.studentName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                              {sv.rating}/5
                            </span>
                          </div>
                        </div>
                        {sv.note && (
                          <p className="mt-3 text-sm text-text-secondary">{sv.note}</p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop / tablet: bảng khảo sát */}
              {surveysInMonth.length === 0 ? (
                <p className="hidden py-6 text-center text-sm text-text-muted md:block">
                  Không có khảo sát trong tháng này.
                </p>
              ) : (
                <table className="hidden w-full min-w-[400px] border-collapse overflow-hidden rounded-xl text-left text-sm md:table">
                  <caption className="sr-only">Khảo sát</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary">
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Ngày
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Học viên
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                        Đánh giá
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveysInMonth.map((sv) => (
                      <tr
                        key={sv.id}
                        className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                      >
                        <td className="px-4 py-3 text-text-primary">{sv.date}</td>
                        <td className="px-4 py-3 text-text-primary">{sv.studentName}</td>
                        <td className="px-4 py-3 tabular-nums text-text-primary">{sv.rating}/5</td>
                        <td className="px-4 py-3 text-text-secondary">{sv.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </motion.section>
          )}
          </AnimatePresence>

        </ClassCard>
      </div>
    </div>
  );
}
