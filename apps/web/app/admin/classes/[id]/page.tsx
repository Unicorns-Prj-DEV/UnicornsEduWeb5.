"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import * as sessionApi from "@/lib/apis/session.api";
import { formatCurrency } from "@/lib/class.helpers";
import {
  ClassCard,
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
import { ClassStatus, ClassType, ClassDetail } from "@/dtos/class.dto";
import { SessionItem } from "@/dtos/session.dto";

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

export default function AdminClassDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
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

  const handleMonthChange = (delta: number) => {
    const [year, month] = selectedMonth.split("-");
    let newMonth = parseInt(month, 10) + delta;
    let newYear = parseInt(year, 10);
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const handleYearChange = (delta: number) => {
    const [year, month] = selectedMonth.split("-");
    const newYear = parseInt(year, 10) + delta;
    setSelectedMonth(`${newYear}-${month}`);
  };

  const handleMonthSelect = (monthVal: string) => {
    setSelectedMonth(`${selectedYear}-${monthVal}`);
    setMonthPopupOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (monthPopupOpen && !target.closest("[data-session-month-nav]")) {
        setMonthPopupOpen(false);
      }
    };
    if (monthPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [monthPopupOpen]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [selectedYear, selectedMonthValue] = selectedMonth.split("-");
  const monthNum = parseInt(selectedMonthValue, 10);
  const monthLabel = `Tháng ${monthNum}/${selectedYear}`;

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

  const classStudents = classDetail?.students ?? [];

  const popupTeachers = useMemo(
    () =>
      (classDetail?.teachers ?? []).map((teacher) => ({
        id: teacher.id,
        fullName: teacher.fullName,
      })),
    [classDetail?.teachers],
  );

  const popupStudents = useMemo(
    () =>
      classStudents.map((student) => ({
        id: student.id,
        fullName: student.fullName,
      })),
    [classStudents],
  );

  const getClassStudents = useCallback(
    async (classId: string) => {
      if (classId === id && classDetail?.students) {
        return classDetail.students.map((s) => ({ id: s.id, fullName: s.fullName }));
      }
      return [];
    },
    [id, classDetail?.students],
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
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại danh sách lớp
        </button>
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
          <p>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Quay lại danh sách lớp
      </button>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex shrink-0">
            <div
              className="flex size-16 items-center justify-center overflow-hidden rounded-xl bg-bg-tertiary ring-2 ring-border-default text-2xl font-semibold text-text-primary"
              aria-hidden
            >
              {(classDetail.name?.trim() || "L").charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute bottom-0 right-0 block size-3 rounded-full border-2 border-bg-surface ${classDetail.status === "running" ? "bg-warning" : "bg-text-muted"}`}
              title={STATUS_LABELS[classDetail.status]}
              aria-hidden
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-text-primary">
                {classDetail.name?.trim() || "Lớp học"}
              </h1>
              <button
                type="button"
                onClick={() => setBasicInfoPopupOpen(true)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted transition hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                aria-label="Chỉnh sửa thông tin cơ bản lớp học"
                title="Chỉnh sửa thông tin cơ bản"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
              <span>
                <span className="font-medium text-text-muted">Phân loại:</span>{" "}
                {TYPE_LABELS[classDetail.type] ?? classDetail.type}
              </span>
              <span>
                <span className="font-medium text-text-muted">Gói học phí:</span>{" "}
                {classDetail.tuitionPackageTotal != null || classDetail.tuitionPackageSession != null
                  ? `${formatCurrency(classDetail.tuitionPackageTotal)} / ${classDetail.tuitionPackageSession ?? "—"} buổi`
                  : "—"}
              </span>
              <span>
                <span className="font-medium text-text-muted">Trợ cấp/HV/buổi:</span>{" "}
                {formatCurrency(classDetail.allowancePerSessionPerStudent)}
              </span>
              <span>
                <span className="font-medium text-text-muted">Scales:</span>{" "}
                {classDetail.scaleAmount ?? "—"}
              </span>
            </div>
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

      <AddSessionPopup
        open={addSessionPopupOpen}
        classId={id}
        defaultTeacherId={classDetail.teachers?.[0]?.id}
        teachers={popupTeachers}
        students={popupStudents}
        onClose={() => setAddSessionPopupOpen(false)}
      />

      <div className="flex flex-col gap-4">
        {/* Row 1: Gia sư phụ trách (trái) | Khung giờ học (phải) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <TutorCard
            teachers={classDetail.teachers}
            className="flex-1"
            action={
              <button
                type="button"
                onClick={() => setTeachersPopupOpen(true)}
                className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
                className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Chỉnh sửa
              </button>
            }
          >
            {scheduleItems.length > 0 ? (
              <div className="space-y-3">
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
              className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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

                  return (
                    <article
                      key={student.id}
                      className="rounded-lg border border-border-default bg-bg-surface p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {student.fullName}
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            Buổi còn lại:{" "}
                            <span className="font-medium tabular-nums">
                              {student.remainingSessions ?? "—"}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isActive
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

            {/* Desktop / tablet: bảng học sinh */}
            <table className="hidden w-full min-w-[400px] border-collapse text-left text-sm md:table">
              <caption className="sr-only">Danh sách học sinh trong lớp</caption>
              <thead>
                <tr className="border-b border-border-default bg-bg-secondary">
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                    Họ tên
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                    Buổi còn lại
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

                    return (
                      <tr
                        key={student.id}
                        className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                      >
                        <td className="px-4 py-3 text-text-primary">{student.fullName}</td>
                        <td className="px-4 py-3 tabular-nums text-text-primary">
                          {student.remainingSessions ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isActive
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

        {/* Row 3: Lịch sử buổi học và khảo sát – 2 tab */}
        <ClassCard title="Lịch sử buổi học và khảo sát" className="w-full">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex gap-0.5 border-b border-border-default">
              <button
                type="button"
                onClick={() => setActiveTab("sessions")}
                className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "sessions"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
                  }`}
              >
                Lịch sử
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("surveys")}
                className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === "surveys"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
                  }`}
              >
                Khảo sát
              </button>
            </div>

            {/* Thanh chuyển tháng – style backup session month picker */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-text-muted">
                {activeTab === "sessions"
                  ? `Tổng số buổi: ${sessionsInMonth.length}`
                  : `Tổng số khảo sát: ${surveysInMonth.length}`}
              </div>
              <div
                data-session-month-nav
                className="relative flex items-center gap-1"
              >
                <button
                  type="button"
                  onClick={() => handleMonthChange(-1)}
                  title="Tháng trước"
                  className="flex min-w-8 items-center justify-center rounded-md border border-border-default bg-bg-surface px-2 py-1 text-sm text-text-primary transition-all duration-200 hover:border-primary hover:bg-bg-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label="Tháng trước"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setMonthPopupOpen(!monthPopupOpen)}
                  title="Chọn tháng/năm"
                  className="rounded-md border-none bg-transparent px-2 py-1 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-expanded={monthPopupOpen}
                  aria-haspopup="dialog"
                >
                  <span className="whitespace-nowrap">{monthLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMonthChange(1)}
                  title="Tháng sau"
                  className="flex min-w-8 items-center justify-center rounded-md border border-border-default bg-bg-surface px-2 py-1 text-sm text-text-primary transition-all duration-200 hover:border-primary hover:bg-bg-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label="Tháng sau"
                >
                  ▶
                </button>
                {monthPopupOpen && (
                  <div
                    role="dialog"
                    aria-label="Chọn tháng"
                    className="absolute left-1/2 top-full z-30 mt-1.5 min-w-[200px] -translate-x-1/2 rounded-md border border-border-default bg-bg-surface p-2 shadow-md"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleYearChange(-1)}
                        className="rounded px-1 py-0.5 transition-colors hover:bg-bg-secondary"
                        aria-label="Năm trước"
                      >
                        ‹
                      </button>
                      <span className="font-medium">{selectedYear}</span>
                      <button
                        type="button"
                        onClick={() => handleYearChange(1)}
                        className="rounded px-1 py-0.5 transition-colors hover:bg-bg-secondary"
                        aria-label="Năm sau"
                      >
                        ›
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {monthNames.map((label, idx) => {
                        const val = String(idx + 1).padStart(2, "0");
                        const isActive = val === selectedMonthValue;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleMonthSelect(val)}
                            className={`rounded border px-2 py-1 text-xs transition-colors ${isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent text-text-primary hover:bg-bg-secondary"
                              }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeTab === "sessions") {
                    setAddSessionPopupOpen(true);
                    return;
                  }

                  toast.info("Chức năng thêm khảo sát đang phát triển.");
                }}
                className="shrink-0 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {activeTab === "sessions" ? "+ Thêm buổi học" : "+ Thêm khảo sát"}
              </button>
            </div>
          </div>

          {activeTab === "sessions" && (
            <>
              {isSessionsLoading ? (
                <SessionHistoryTableSkeleton rows={5} entityMode="teacher" showActionsColumn />
              ) : (
                <SessionHistoryTable
                  sessions={sessionsInMonth}
                  entityMode="teacher"
                  emptyText="Không có buổi học trong tháng này."
                  onSessionUpdated={handleSessionUpdated}
                  teachers={popupTeachers}
                  getClassStudents={getClassStudents}
                />
              )}
              {isSessionsError ? (
                <p className="mt-3 text-sm text-error" role="alert">
                  Không tải được lịch sử buổi học.
                </p>
              ) : null}
            </>
          )}

          {activeTab === "surveys" && (
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
                <table className="hidden w-full min-w-[400px] border-collapse text-left text-sm md:table">
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
          )}

        </ClassCard>
      </div>
    </div>
  );
}
