"use client";

import { useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    EditStudentClassesPopup,
    EditStudentPopup,
    StudentBalancePopup,
    StudentDetailRow,
    StudentInfoCard,
    StudentExamCard,
    StudentWalletHistoryPopup,
    StudentWalletCard,
    StudentClassTuitionPopup,
} from "@/components/admin/student";
import type { StudentDetail, StudentGender, StudentStatus } from "@/dtos/student.dto";
import {
    buildAdminLikePath,
    resolveAdminLikeRouteBase,
} from "@/lib/admin-shell-paths";
import * as studentApi from "@/lib/apis/student.api";
import { formatCurrency } from "@/lib/class.helpers";

const STATUS_LABELS: Record<StudentStatus, string> = {
    active: "Đang học",
    inactive: "Ngừng theo dõi",
};

const GENDER_LABELS: Record<StudentGender, string> = {
    male: "Nam",
    female: "Nữ",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(new Date(iso));
    } catch {
        return "—";
  }
}

function formatCustomerCareProfitPercent(value?: number | null): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return `${Math.round(value * 100)}%`;
}

function normalizeStatus(status?: StudentStatus): StudentStatus {
    return status === "inactive" ? "inactive" : "active";
}

function normalizeGender(gender?: StudentGender): StudentGender {
    return gender === "female" ? "female" : "male";
}

function statusBadgeClass(status: StudentStatus): string {
    return status === "active"
        ? "bg-success/10 text-success ring-success/20"
        : "bg-error/10 text-error ring-error/20";
}

function formatTuitionPackageLabel(params: {
    packageTotal?: number | null;
    packageSession?: number | null;
    studentTuitionPerSession?: number | null;
}) {
    const { packageTotal, packageSession, studentTuitionPerSession } = params;

    if (packageTotal != null || packageSession != null) {
        return `${formatCurrency(packageTotal)} / ${packageSession ?? "—"} buổi`;
    }

    if (studentTuitionPerSession != null) {
        return `${formatCurrency(studentTuitionPerSession)} / buổi`;
    }

    return "Chưa cấu hình";
}

function getTuitionPackageSourceLabel(source?: "custom" | "class" | "unset") {
    if (source === "custom") return "Gói riêng";
    if (source === "class") return "Theo lớp";
    return null;
}

export default function AdminStudentDetailPage() {
    const params = useParams();
    const id = typeof params?.id === "string" ? params.id : "";
    const router = useRouter();
    const pathname = usePathname();
    const routeBase = resolveAdminLikeRouteBase(pathname);
    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [classesPopupOpen, setClassesPopupOpen] = useState(false);
    const [balancePopupMode, setBalancePopupMode] = useState<"topup" | "withdraw" | null>(null);
    const [walletHistoryOpen, setWalletHistoryOpen] = useState(false);
    const [editingPackageForClassId, setEditingPackageForClassId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const {
        data: student,
        isLoading,
        isError,
        error,
    } = useQuery<StudentDetail>({
        queryKey: ["student", "detail", id],
        queryFn: () => studentApi.getStudentById(id),
        enabled: !!id,
    });

    const classItemsWithTuition = useMemo(
        () =>
            (student?.studentClasses ?? [])
                .flatMap((item) => {
                    const classId = item.class?.id;
                    const className = item.class?.name?.trim();

                    if (!classId || !className) {
                        return [];
                    }

                    return [
                        {
                            classId,
                            className,
                            classStatus: item.class.status ?? null,
                            packageTotal: item.effectiveTuitionPackageTotal ?? null,
                            packageSession: item.effectiveTuitionPackageSession ?? null,
                            tuitionPackageLabel: formatTuitionPackageLabel({
                                packageTotal: item.effectiveTuitionPackageTotal,
                                packageSession: item.effectiveTuitionPackageSession,
                                studentTuitionPerSession: item.effectiveTuitionPerSession,
                            }),
                            tuitionPackageSourceLabel: getTuitionPackageSourceLabel(item.tuitionPackageSource),
                            tuitionPerSession: item.effectiveTuitionPerSession ?? null,
                            attendedSessions: item.totalAttendedSession ?? null,
                        },
                    ];
                })
                .sort((a, b) => a.className.localeCompare(b.className, "vi")),
        [student],
    );

    const removeClassMutation = useMutation({
        mutationFn: async (classId: string) => {
            const nextClassIds = classItemsWithTuition
                .filter((item) => item.classId !== classId)
                .map((item) => item.classId);

            await studentApi.updateStudentClasses(id, {
                class_ids: nextClassIds,
            });

            return classId;
        },
        onSuccess: async (classId) => {
            toast.success("Đã gỡ lớp khỏi học sinh.");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["student", "detail", id] }),
                queryClient.invalidateQueries({ queryKey: ["student", "list"] }),
                queryClient.invalidateQueries({ queryKey: ["class", "list"] }),
                queryClient.invalidateQueries({ queryKey: ["class", "detail", classId] }),
            ]);
        },
        onError: (err: unknown) => {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                (err as Error)?.message ??
                "Không thể gỡ lớp khỏi học sinh.";
            toast.error(msg);
        },
    });

    const handleTopUp = () => setBalancePopupMode("topup");

    const handleWithdraw = () => setBalancePopupMode("withdraw");

    if (isLoading) {
        return (
            <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6" aria-busy="true">
                <div className="mb-4 h-8 w-44 animate-pulse rounded bg-bg-tertiary" />
                <div className="rounded-[1.75rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
                    <div className="h-24 animate-pulse rounded-2xl bg-bg-secondary" />
                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-4">
                            <div className="h-56 animate-pulse rounded-2xl bg-bg-secondary" />
                            <div className="h-52 animate-pulse rounded-2xl bg-bg-secondary" />
                        </div>
                        <div className="space-y-4">
                            <div className="h-40 animate-pulse rounded-2xl bg-bg-secondary" />
                            <div className="h-64 animate-pulse rounded-2xl bg-bg-secondary" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!id || isError || !student) {
        const message = !id
            ? "Thiếu mã học sinh."
            : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            "Không tìm thấy hoặc không tải được hồ sơ học sinh.";

        return (
            <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:px-0"
                >
                    <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Quay lại danh sách học sinh</span>
                </button>

                <div className="rounded-2xl border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
                    <p>{message}</p>
                </div>
            </div>
        );
    }

    const normalizedStatus = normalizeStatus(student.status);
    const normalizedGender = normalizeGender(student.gender);
    const primaryChipClass = statusBadgeClass(normalizedStatus);
    const initials = (student.fullName?.trim() || student.email || "?").charAt(0).toUpperCase();
    const contactEmail = student.email?.trim() || "Chưa có email";

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
            <button
                type="button"
                onClick={() => router.back()}
                className="mb-3 inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-bg-secondary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary sm:mb-4 sm:rounded-md sm:border-0 sm:bg-transparent sm:px-0 sm:shadow-none"
            >
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Quay lại danh sách học sinh</span>
            </button>

            <EditStudentPopup
                key={`${student.id}-${student.updatedAt ?? "stable"}-${editPopupOpen ? "open" : "closed"}`}
                open={editPopupOpen}
                onClose={() => setEditPopupOpen(false)}
                student={student}
            />
            <EditStudentClassesPopup
                key={`${student.id}-${student.updatedAt ?? "stable"}-classes-${classesPopupOpen ? "open" : "closed"}`}
                open={classesPopupOpen}
                onClose={() => setClassesPopupOpen(false)}
                student={student}
            />
            <StudentBalancePopup
                key={`${student.id}-${student.updatedAt ?? "stable"}-balance-${balancePopupMode ?? "closed"}`}
                open={balancePopupMode !== null}
                mode={balancePopupMode ?? "topup"}
                onClose={() => setBalancePopupMode(null)}
                student={student}
            />
            <StudentWalletHistoryPopup
                open={walletHistoryOpen}
                onClose={() => setWalletHistoryOpen(false)}
                studentId={student.id}
                studentName={student.fullName?.trim() || "Học sinh"}
                currentBalance={student.accountBalance ?? 0}
            />
            {editingPackageForClassId ? (() => {
                const item = classItemsWithTuition.find((classItem) => classItem.classId === editingPackageForClassId);

                return (
                    <StudentClassTuitionPopup
                        open
                        onClose={() => setEditingPackageForClassId(null)}
                        classId={editingPackageForClassId}
                        className={item?.className ?? ""}
                        studentId={student.id}
                        initialPackageTotal={item?.packageTotal ?? null}
                        initialPackageSession={item?.packageSession ?? null}
                        initialTuitionPerSession={item?.tuitionPerSession ?? null}
                        classDefaultTuitionPerSession={item?.tuitionPerSession ?? null}
                        onSuccess={() => setEditingPackageForClassId(null)}
                    />
                );
            })() : null}

            <section className="relative overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface p-3.5 shadow-sm sm:rounded-[1.75rem] sm:p-5">
                <div className="pointer-events-none absolute -left-16 top-6 size-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                <div className="pointer-events-none absolute bottom-0 right-0 size-52 rounded-full bg-warning/10 blur-3xl" aria-hidden />

                <div className="relative">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
                            <div className="relative shrink-0">
                                <div className="flex size-14 items-center justify-center rounded-[1.25rem] border border-border-default bg-bg-secondary text-lg font-semibold text-text-primary shadow-sm sm:size-20 sm:rounded-2xl sm:text-3xl">
                                    {initials}
                                </div>
                                <span
                                    className={`absolute -bottom-1 -right-1 block size-3.5 rounded-full border-2 border-bg-surface ${normalizedStatus === "active" ? "bg-success" : "bg-error"
                                        }`}
                                    aria-hidden
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                                    Thông tin học sinh
                                </p>
                                <div className="mt-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <h1 className="min-w-0 text-2xl font-semibold leading-tight text-text-primary sm:truncate">
                                            {student.fullName?.trim() || "Học sinh"}
                                        </h1>
                                        <button
                                            type="button"
                                            onClick={() => setEditPopupOpen(true)}
                                            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted transition hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface sm:size-8"
                                            aria-label="Chỉnh sửa thông tin học sinh"
                                            title="Chỉnh sửa"
                                        >
                                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586Z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${primaryChipClass}`}
                                        >
                                            {STATUS_LABELS[normalizedStatus]}
                                        </span>
                                        <span className="inline-flex rounded-full bg-bg-tertiary px-2.5 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-default">
                                            {GENDER_LABELS[normalizedGender]}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-2 sm:hidden">
                                    <div className="rounded-2xl border border-border-default bg-bg-primary/80 px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                            Liên hệ chính
                                        </p>
                                        <p className="mt-1 break-all text-sm font-medium text-text-primary">
                                            {contactEmail}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hidden shrink-0 items-center gap-2 sm:flex xl:flex-col xl:items-stretch">
                            <div className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-secondary">
                                {contactEmail}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3.5 sm:mt-5 sm:gap-4">
                        <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[0.95fr_0.95fr_1.1fr] sm:gap-4">
                            <StudentInfoCard title="Thông tin cơ bản">
                                <dl className="divide-y divide-border-subtle">
                                    <StudentDetailRow label="Email" value={student.email?.trim() || "—"} />
                                    <StudentDetailRow label="Trường" value={student.school?.trim() || "—"} />
                                    <StudentDetailRow label="Tỉnh / Thành phố" value={student.province?.trim() || "—"} />
                                    <StudentDetailRow
                                        label="CSKH phụ trách"
                                        value={
                                            student.customerCare?.staff
                                                ? `${student.customerCare.staff.fullName}${student.customerCare.staff.status === "inactive" ? " · Ngừng hoạt động" : ""}`
                                                : "—"
                                        }
                                    />
                                    <StudentDetailRow
                                        label="Tỷ lệ lợi nhuận CSKH"
                                        value={formatCustomerCareProfitPercent(student.customerCare?.profitPercent)}
                                    />
                                    <StudentDetailRow label="Năm sinh" value={student.birthYear ?? "—"} />
                                    <StudentDetailRow label="Ngày tạo hồ sơ" value={formatDate(student.createdAt)} />
                                    <StudentDetailRow label="Ngày ngừng theo dõi" value={formatDate(student.dropOutDate)} />
                                    <StudentDetailRow label="Mục tiêu học tập" value={student.goal?.trim() || "—"} />
                                </dl>
                            </StudentInfoCard>

                            <StudentInfoCard title="Liên hệ phụ huynh">
                                <dl className="divide-y divide-border-subtle">
                                    <StudentDetailRow label="Họ tên" value={student.parentName?.trim() || "—"} />
                                    <StudentDetailRow label="Số điện thoại" value={student.parentPhone?.trim() || "—"} />
                                    <StudentDetailRow
                                        label="Trạng thái"
                                        value={
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${primaryChipClass}`}
                                            >
                                                {STATUS_LABELS[normalizedStatus]}
                                            </span>
                                        }
                                    />
                                </dl>
                            </StudentInfoCard>

                            <div className="space-y-3.5 lg:col-span-2 xl:col-span-1 sm:space-y-4">
                                <StudentWalletCard
                                    balance={student.accountBalance ?? 0}
                                    onTopUp={handleTopUp}
                                    onWithdraw={handleWithdraw}
                                    onOpenHistory={() => setWalletHistoryOpen(true)}
                                />
                                <StudentExamCard key={student.id} studentId={student.id} />
                            </div>
                        </div>

                        {/* <StudentInfoCard title="Phân bổ lớp học"> */}
                        <div className="rounded-[1.25rem] border border-border-default bg-bg-secondary/50 p-3.5 sm:rounded-2xl sm:p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2
                                        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted sm:mb-4 sm:text-xs"
                                    >
                                        Danh sách lớp học
                                    </h2>
                                </div>
                                <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-col sm:items-end">
                                    <button
                                        type="button"
                                        onClick={() => setClassesPopupOpen(true)}
                                        className="inline-flex min-h-11 min-w-11 w-full items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:w-auto"
                                        aria-label="Điều chỉnh lớp"
                                        title="Điều chỉnh lớp"
                                    >
                                        <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4v16m8-8H4"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {classItemsWithTuition.length > 0 ? (
                                <>
                                    <div className="mt-4 space-y-3 md:hidden">
                                        {classItemsWithTuition.map((item) => (
                                            <div
                                                key={item.classId}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    router.push(
                                                        buildAdminLikePath(
                                                            routeBase,
                                                            `classes/${encodeURIComponent(item.classId)}`,
                                                        ),
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        router.push(
                                                            buildAdminLikePath(
                                                                routeBase,
                                                                `classes/${encodeURIComponent(item.classId)}`,
                                                            ),
                                                        );
                                                    }
                                                }}
                                                className="group relative cursor-pointer rounded-[1.1rem] border border-border-default bg-bg-surface px-3.5 py-3 shadow-sm transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void removeClassMutation.mutateAsync(item.classId);
                                                    }}
                                                    disabled={removeClassMutation.isPending}
                                                    className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-error/10 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
                                                    aria-label={`Gỡ lớp ${item.className}`}
                                                    title="Gỡ lớp"
                                                >
                                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                                <div className="flex flex-col gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`inline-block size-2 shrink-0 rounded-full ${
                                                                    item.classStatus === "running"
                                                                        ? "bg-success"
                                                                        : item.classStatus === "ended"
                                                                            ? "bg-error"
                                                                            : "bg-border-default"
                                                                }`}
                                                                aria-hidden
                                                            />
                                                            <p className="font-medium text-text-primary">{item.className}</p>
                                                        </div>
                                                        <div className="mt-2 flex flex-col gap-1.5 text-sm text-text-secondary">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingPackageForClassId(item.classId);
                                                                }}
                                                                className="inline-flex w-full items-center gap-2 rounded-xl border border-border-default bg-secondary/20 px-3 py-2.5 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                                                aria-label={`Chỉnh gói học phí: ${item.className}`}
                                                                title="Chỉnh gói học phí"
                                                            >
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="text-text-secondary">Gói học phí: </span>
                                                                    <span className="font-medium text-text-primary">
                                                                        {item.tuitionPackageLabel}
                                                                    </span>
                                                                </span>
                                                                <svg className="size-4 shrink-0 text-current opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                            <span>
                                                                Học phí/buổi:{" "}
                                                                <span className="font-medium text-text-primary tabular-nums">
                                                                    {item.tuitionPerSession != null ? formatCurrency(item.tuitionPerSession) : "—"}
                                                                </span>
                                                            </span>
                                                            <span>
                                                                Số buổi:{" "}
                                                                <span className="font-medium text-text-primary tabular-nums">
                                                                    {item.attendedSessions ?? "—"}
                                                                </span>
                                                            </span>
                                                            {item.tuitionPackageSourceLabel ? (
                                                                <span className="inline-flex w-fit rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border-default">
                                                                    {item.tuitionPackageSourceLabel}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 hidden overflow-x-auto md:block">
                                        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-border-default bg-bg-secondary">
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                                                        Lớp
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                                                        Gói học phí
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                                                        Học phí/buổi
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                                                        Số buổi
                                                    </th>
                                                    <th scope="col" className="w-12 px-2 py-3">
                                                        <span className="sr-only">Gỡ lớp</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classItemsWithTuition.map((item) => (
                                                    <tr
                                                        key={item.classId}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() =>
                                                            router.push(
                                                                buildAdminLikePath(
                                                                    routeBase,
                                                                    `classes/${encodeURIComponent(item.classId)}`,
                                                                ),
                                                            )
                                                        }
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter" || event.key === " ") {
                                                                event.preventDefault();
                                                                router.push(
                                                                    buildAdminLikePath(
                                                                        routeBase,
                                                                        `classes/${encodeURIComponent(item.classId)}`,
                                                                    ),
                                                                );
                                                            }
                                                        }}
                                                        className="group cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                                    >
                                                        <td className="px-4 py-3 text-text-primary">
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className={`inline-block size-2 shrink-0 rounded-full ${
                                                                        item.classStatus === "running"
                                                                            ? "bg-success"
                                                                            : item.classStatus === "ended"
                                                                                ? "bg-error"
                                                                                : "bg-border-default"
                                                                    }`}
                                                                    aria-hidden
                                                                />
                                                                <span className="block truncate">{item.className}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-text-secondary">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingPackageForClassId(item.classId);
                                                                }}
                                                                className="inline-flex w-full max-w-full items-center gap-2 rounded-xl border border-border-default bg-secondary/20 py-2 pl-3 pr-2.5 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                                                aria-label={`Chỉnh gói học phí: ${item.className}`}
                                                                title="Chỉnh gói học phí"
                                                            >
                                                                <span className="min-w-0 flex-1 space-y-0.5">
                                                                    <p className="truncate font-medium text-text-primary">{item.tuitionPackageLabel}</p>
                                                                    {item.tuitionPackageSourceLabel ? (
                                                                        <p className="text-xs font-medium text-text-muted">
                                                                            {item.tuitionPackageSourceLabel}
                                                                        </p>
                                                                    ) : null}
                                                                </span>
                                                                <svg className="size-4 shrink-0 text-current opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 tabular-nums font-semibold text-text-primary">
                                                            {item.tuitionPerSession != null ? formatCurrency(item.tuitionPerSession) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 tabular-nums font-semibold text-text-primary">
                                                            {item.attendedSessions ?? "—"}
                                                        </td>
                                                        <td className="px-2 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    void removeClassMutation.mutateAsync(item.classId);
                                                                }}
                                                                disabled={removeClassMutation.isPending}
                                                                className="rounded p-1.5 text-text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-error/10 hover:text-error focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
                                                                aria-label={`Gỡ lớp ${item.className}`}
                                                                title="Gỡ lớp"
                                                            >
                                                                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-4 rounded-2xl border border-dashed border-border-default bg-bg-surface px-4 py-4">
                                    <p className="text-sm text-text-muted">
                                        Học sinh này chưa được gán lớp nào. Dùng nút phía trên để thêm lớp đầu tiên.
                                    </p>
                                </div>
                            )}
                        </div>
                        {/* </StudentInfoCard> */}
                    </div>
                </div>
            </section>

        </div>
    );
}
