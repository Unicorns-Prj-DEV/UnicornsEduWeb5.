"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    EditStudentClassesPopup,
    EditStudentPopup,
    StudentBalancePopup,
    StudentDetailRow,
    StudentInfoCard,
    StudentWalletCard,
} from "@/components/admin/student";
import type { StudentDetail, StudentGender, StudentStatus } from "@/dtos/student.dto";
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

function normalizeStatus(status?: StudentStatus): StudentStatus {
    return status === "inactive" ? "inactive" : "active";
}

function normalizeGender(gender?: StudentGender): StudentGender {
    return gender === "female" ? "female" : "male";
}

function statusBadgeClass(status: StudentStatus): string {
    return status === "active"
        ? "bg-primary/10 text-primary ring-primary/20"
        : "bg-bg-secondary text-text-secondary ring-border-default";
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

export default function AdminStudentDetailPage() {
    const params = useParams();
    const id = typeof params?.id === "string" ? params.id : "";
    const router = useRouter();
    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [classesPopupOpen, setClassesPopupOpen] = useState(false);
    const [balancePopupMode, setBalancePopupMode] = useState<"topup" | "withdraw" | null>(null);

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
        () => {
            const classes = new Map<
                string,
                {
                    classId: string;
                    className: string;
                    tuitionPackageLabel: string;
                    tuitionPackageSourceLabel: string | null;
                }
            >();

            for (const item of student?.studentClasses ?? []) {
                const classId = item.class?.id;
                const className = item.class?.name?.trim();

                if (!classId || !className || classes.has(classId)) continue;

                classes.set(classId, {
                    classId,
                    className,
                    tuitionPackageLabel: formatTuitionPackageLabel({
                        packageTotal: item.effectiveTuitionPackageTotal,
                        packageSession: item.effectiveTuitionPackageSession,
                        studentTuitionPerSession: item.effectiveTuitionPerSession,
                    }),
                    tuitionPackageSourceLabel:
                        item.tuitionPackageSource === "custom"
                            ? "Gói riêng"
                            : item.tuitionPackageSource === "class"
                                ? "Theo lớp"
                                : null,
                });
            }

            return Array.from(classes.values()).sort((a, b) =>
                a.className.localeCompare(b.className, "vi"),
            );
        },
        [student?.studentClasses],
    );

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
                                    className={`absolute -bottom-1 -right-1 block size-3.5 rounded-full border-2 border-bg-surface ${normalizedStatus === "active" ? "bg-primary" : "bg-text-muted"
                                        }`}
                                    aria-hidden
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                                    Thông tin học sinh
                                </p>
                                <div className="mt-2 flex flex-col gap-2">
                                    <h1 className="min-w-0 text-2xl font-semibold leading-tight text-text-primary sm:truncate">
                                        {student.fullName?.trim() || "Học sinh"}
                                    </h1>
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
                                    <button
                                        type="button"
                                        onClick={() => setEditPopupOpen(true)}
                                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:w-full"
                                    >
                                        <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586Z" />
                                        </svg>
                                        Chỉnh sửa hồ sơ
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="hidden shrink-0 items-center gap-2 sm:flex xl:flex-col xl:items-stretch">
                            <button
                                type="button"
                                onClick={() => setEditPopupOpen(true)}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            >
                                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586Z" />
                                </svg>
                                Chỉnh sửa
                            </button>
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
                                    <StudentDetailRow label="Năm sinh" value={student.birthYear ?? "—"} />
                                    <StudentDetailRow label="Ngày tạo hồ sơ" value={formatDate(student.createdAt)} />
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

                            <StudentWalletCard
                                className="lg:col-span-2 xl:col-span-1"
                                balance={student.accountBalance ?? 0}
                                onTopUp={handleTopUp}
                                onWithdraw={handleWithdraw}
                            />
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
                                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:w-auto"
                                    >
                                        <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4v16m8-8H4"
                                            />
                                        </svg>
                                        Điều chỉnh lớp
                                    </button>
                                </div>
                            </div>

                            {classItemsWithTuition.length > 0 ? (
                                <>
                                    <div className="mt-4 space-y-3 md:hidden">
                                        {classItemsWithTuition.map((item, index) => (
                                            <div
                                                key={item.classId}
                                                className="rounded-[1.1rem] border border-border-default bg-bg-surface px-3.5 py-3 shadow-sm"
                                            >
                                                <div className="flex flex-col gap-3">
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-text-primary">{item.className}</p>
                                                        <div className="mt-2 flex flex-col gap-1.5 text-sm text-text-secondary">
                                                            <span>
                                                                Gói học phí:{" "}
                                                                <span className="font-medium text-text-primary">
                                                                    {item.tuitionPackageLabel}
                                                                </span>
                                                            </span>
                                                            {item.tuitionPackageSourceLabel ? (
                                                                <span className="inline-flex w-fit rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border-default">
                                                                    {item.tuitionPackageSourceLabel}
                                                                </span>
                                                            ) : null}
                                                            <span>
                                                                Thứ tự:{" "}
                                                                <span className="font-medium text-primary">#{index + 1}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="inline-flex self-start rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/20">
                                                        Đang theo học
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 hidden overflow-x-auto md:block">
                                        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-border-default bg-bg-secondary">
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                                                        Lớp
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                                                        Gói học phí
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary tabular-nums">
                                                        Thứ tự
                                                    </th>
                                                    <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                                                        Trạng thái
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classItemsWithTuition.map((item, index) => (
                                                    <tr
                                                        key={item.classId}
                                                        className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
                                                    >
                                                        <td className="px-4 py-3 text-text-primary">{item.className}</td>
                                                        <td className="px-4 py-3 text-text-secondary">
                                                            <div className="space-y-1">
                                                                <p>{item.tuitionPackageLabel}</p>
                                                                {item.tuitionPackageSourceLabel ? (
                                                                    <p className="text-xs font-medium text-text-muted">
                                                                        {item.tuitionPackageSourceLabel}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 tabular-nums font-semibold text-primary">
                                                            #{index + 1}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/20">
                                                                Đang theo học
                                                            </span>
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
