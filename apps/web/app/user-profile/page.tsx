"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import UpgradedSelect, {
  type UpgradedSelectOption,
} from "@/components/ui/UpgradedSelect";
import * as authApi from "@/lib/apis/auth.api";
import type {
  FullProfileDto,
  UpdateMyProfileDto,
  UpdateMyStaffProfileDto,
  UpdateMyStudentProfileDto,
} from "@/dtos/profile.dto";

type Tone = "primary" | "success" | "warning" | "neutral";

type CompletionStats = {
  filled: number;
  total: number;
  percentage: number;
};

type SectionItem = {
  id: string;
  label: string;
  description: string;
  completion: CompletionStats;
  tone: Tone;
};

type DetailItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  fullWidth?: boolean;
};

type FieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  min?: number;
  max?: number;
  autoComplete?: string;
};

const inputClassName =
  "w-full rounded-2xl border border-border-default bg-bg-primary px-4 py-3 text-sm text-text-primary transition-all duration-200 placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-4 focus:ring-border-focus/10";
const labelClassName =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted";
const softCardClassName =
  "rounded-[24px] border border-border-default bg-bg-surface shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]";
const ghostButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-all duration-200 hover:-translate-y-0.5 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-text-inverse transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60";

function formatDate(iso: string | null | undefined): string {
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

function displayName(profile: FullProfileDto): string {
  const first = profile.first_name?.trim() ?? "";
  const last = profile.last_name?.trim() ?? "";
  if (first || last) return `${first} ${last}`.trim();
  return profile.accountHandle ?? profile.email ?? "—";
}

function getInitials(profile: FullProfileDto): string {
  const source = displayName(profile)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!source.length) return "UE";
  return source.map((part) => part.charAt(0).toUpperCase()).join("");
}

function isFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function getCompletionStats(values: Array<unknown>): CompletionStats {
  const total = values.length;
  const filled = values.filter(isFilled).length;
  return {
    filled,
    total,
    percentage: total ? Math.round((filled / total) * 100) : 0,
  };
}

function humanizeToken(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRoleLabel(role: string | null | undefined): string {
  const roleMap: Record<string, string> = {
    admin: "Quản trị viên",
    staff: "Nhân sự",
    student: "Học viên",
    guest: "Khách",
  };
  return role ? roleMap[role] ?? humanizeToken(role) : "Chưa xác định";
}

function getGenderLabel(gender: string | null | undefined): string {
  if (gender === "female") return "Nữ";
  if (gender === "male") return "Nam";
  return "—";
}

function getToneColor(tone: Tone): string {
  switch (tone) {
    case "primary":
      return "var(--ue-primary)";
    case "success":
      return "var(--ue-success)";
    case "warning":
      return "var(--ue-warning)";
    default:
      return "var(--ue-text-muted)";
  }
}

function getFieldValue(form: HTMLFormElement, name: string): string | undefined {
  const field = form.elements.namedItem(name);
  if (!field) return undefined;

  if (field instanceof RadioNodeList) {
    const value = field.value?.trim();
    return value || undefined;
  }

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
  ) {
    const value = field.value?.trim();
    return value || undefined;
  }

  return undefined;
}

function Tag({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-secondary shadow-sm">
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: getToneColor(tone) }}
      />
      {label}
    </span>
  );
}

function QuickFact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-primary px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "primary",
  style,
}: {
  label: string;
  value: string;
  tone?: Tone;
  style?: CSSProperties;
}) {
  return (
    <div
      className="rounded-2xl border border-border-default bg-bg-primary p-4"
      style={style}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
      <p
        className="mt-3 text-2xl font-semibold tracking-[-0.04em]"
        style={{ color: getToneColor(tone) }}
      >
        {value}
      </p>
    </div>
  );
}

function SectionProgress({
  label,
  description,
  completion,
  tone,
  href,
}: SectionItem & { href: string }) {
  const progressStyle = {
    width: `${completion.percentage}%`,
    backgroundColor: getToneColor(tone),
  };

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border-default bg-bg-primary p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-focus hover:bg-bg-secondary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        <span
          className="text-sm font-semibold"
          style={{ color: getToneColor(tone) }}
        >
          {completion.percentage}%
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-bg-secondary">
        <div className="h-full rounded-full" style={progressStyle} />
      </div>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-text-muted">
        {completion.filled}/{completion.total} trường dữ liệu
      </p>
    </Link>
  );
}

function DetailGrid({ items }: { items: DetailItem[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={item.fullWidth ? "sm:col-span-2" : undefined}
        >
          <div className="h-full rounded-2xl border border-border-default bg-bg-primary p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              {item.label}
            </dt>
            <dd className="mt-3 text-base font-medium leading-7 text-text-primary">
              {item.value}
            </dd>
            {item.hint ? (
              <p className="mt-2 text-sm leading-6 text-text-secondary">{item.hint}</p>
            ) : null}
          </div>
        </div>
      ))}
    </dl>
  );
}

function TextField({
  id,
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  min,
  max,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className={inputClassName}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        min={min}
        max={max}
        autoComplete={autoComplete}
      />
    </div>
  );
}

function SelectField({
  id,
  name,
  label,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  options: UpgradedSelectOption[];
}) {
  const labelId = `${id}-label`;
  return (
    <div>
      <label id={labelId} className={labelClassName}>
        {label}
      </label>
      <UpgradedSelect
        key={`${id}-${defaultValue ?? ""}`}
        id={id}
        name={name}
        defaultValue={defaultValue}
        options={options}
        labelId={labelId}
        buttonClassName={inputClassName}
      />
    </div>
  );
}

function FormActions({
  pending,
  onCancel,
}: {
  pending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 border-t border-border-default pt-5">
      <button type="submit" disabled={pending} className={primaryButtonClassName}>
        {pending ? "Đang lưu…" : "Lưu thay đổi"}
      </button>
      <button type="button" onClick={onCancel} className={ghostButtonClassName}>
        Hủy
      </button>
    </div>
  );
}

function ProfileSection({
  id,
  eyebrow,
  title,
  description,
  tone,
  completion,
  isEditing,
  onEdit,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: Tone;
  completion: CompletionStats;
  isEditing: boolean;
  onEdit?: () => void;
  children: ReactNode;
}) {
  const accent = getToneColor(tone);

  return (
    <section
      id={id}
      className={`${softCardClassName} motion-fade-up relative scroll-mt-24 overflow-hidden`}
      style={{
        backgroundImage: `radial-gradient(circle at top right, color-mix(in srgb, ${accent} 14%, transparent), transparent 36%), linear-gradient(180deg, var(--ue-bg-surface), color-mix(in srgb, var(--ue-bg-secondary) 28%, var(--ue-bg-surface)))`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accent }}
      />
      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Tag label={eyebrow} tone={tone} />
              <Tag
                label={`${completion.filled}/${completion.total} mục đã điền`}
                tone="neutral"
              />
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-text-primary sm:text-[2rem]">
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              {description}
            </p>
          </div>

          {!isEditing && onEdit ? (
            <button type="button" onClick={onEdit} className={ghostButtonClassName}>
              Chỉnh sửa
            </button>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-border-default bg-bg-primary px-4 py-4">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
            <span>Mức độ hoàn thiện</span>
            <span>{completion.percentage}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-bg-secondary">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completion.percentage}%`,
                backgroundColor: accent,
              }}
            />
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen overflow-hidden bg-bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div
          className={`${softCardClassName} animate-pulse overflow-hidden p-6 sm:p-8`}
        >
          <div className="h-4 w-40 rounded-full bg-bg-tertiary" />
          <div className="mt-5 h-12 max-w-xl rounded-2xl bg-bg-tertiary" />
          <div className="mt-4 h-5 max-w-2xl rounded-full bg-bg-tertiary" />
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="h-24 rounded-2xl bg-bg-tertiary" />
            <div className="h-24 rounded-2xl bg-bg-tertiary" />
            <div className="h-24 rounded-2xl bg-bg-tertiary" />
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className={`${softCardClassName} animate-pulse p-5`}>
            <div className="h-5 w-32 rounded-full bg-bg-tertiary" />
            <div className="mt-5 space-y-3">
              <div className="h-28 rounded-2xl bg-bg-tertiary" />
              <div className="h-28 rounded-2xl bg-bg-tertiary" />
            </div>
          </div>
          <div className="space-y-6">
            <div className={`${softCardClassName} animate-pulse p-6 sm:p-8`}>
              <div className="h-5 w-48 rounded-full bg-bg-tertiary" />
              <div className="mt-4 h-4 w-full rounded-full bg-bg-tertiary" />
              <div className="mt-2 h-4 w-2/3 rounded-full bg-bg-tertiary" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded-2xl bg-bg-tertiary" />
                <div className="h-24 rounded-2xl bg-bg-tertiary" />
                <div className="h-24 rounded-2xl bg-bg-tertiary" />
                <div className="h-24 rounded-2xl bg-bg-tertiary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ status }: { status?: number }) {
  const needAuth = status === 401;

  return (
    <div className="min-h-screen overflow-hidden bg-bg-primary">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-8 sm:px-6">
        <div
          className={`${softCardClassName} motion-fade-up relative w-full overflow-hidden p-8 sm:p-10`}
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, color-mix(in srgb, var(--ue-primary) 12%, transparent), transparent 34%), linear-gradient(180deg, var(--ue-bg-surface), var(--ue-bg-secondary))",
          }}
        >
          <Tag label={needAuth ? "Yêu cầu đăng nhập" : "Không thể tải dữ liệu"} tone={needAuth ? "warning" : "neutral"} />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-text-primary">
            {needAuth ? "Bạn cần đăng nhập để xem hồ sơ." : "Trang hồ sơ hiện chưa khả dụng."}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
            {needAuth
              ? "Phiên truy cập hiện tại không hợp lệ hoặc đã hết hạn. Đăng nhập lại để tiếp tục chỉnh sửa thông tin cá nhân."
              : "Có lỗi xảy ra khi lấy dữ liệu hồ sơ từ hệ thống. Bạn có thể quay lại trang chủ hoặc thử tải lại sau."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={needAuth ? "/auth/login" : "/"}
              className={primaryButtonClassName}
            >
              {needAuth ? "Đăng nhập" : "Về trang chủ"}
            </Link>
            <Link href="/" className={ghostButtonClassName}>
              Quay lại hệ thống
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState(false);
  const [editStaff, setEditStaff] = useState(false);
  const [editStudent, setEditStudent] = useState(false);

  const {
    data: profile,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["profile", "full"],
    queryFn: authApi.getFullProfile,
    retry: (failureCount, err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) return false;
      return failureCount < 2;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", "full"], data);
      setEditUser(false);
      toast.success("Đã cập nhật thông tin tài khoản.");
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Cập nhật thất bại.");
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: authApi.updateMyStaffProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", "full"], data);
      setEditStaff(false);
      toast.success("Đã cập nhật thông tin nhân sự.");
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Cập nhật thất bại.");
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: authApi.updateMyStudentProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", "full"], data);
      setEditStudent(false);
      toast.success("Đã cập nhật thông tin học viên.");
    },
    onError: (err: unknown) => {
      const ax = err as { response?: { data?: { message?: string } } };
      toast.error(ax.response?.data?.message ?? "Cập nhật thất bại.");
    },
  });

  const handleSubmitUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const payload: UpdateMyProfileDto = {
      first_name: getFieldValue(form, "first_name"),
      last_name: getFieldValue(form, "last_name"),
      email: getFieldValue(form, "email"),
      phone: getFieldValue(form, "phone"),
      province: getFieldValue(form, "province"),
      accountHandle: getFieldValue(form, "accountHandle"),
    };
    updateProfileMutation.mutate(payload);
  };

  const handleSubmitStaff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const payload: UpdateMyStaffProfileDto = {
      full_name: getFieldValue(form, "full_name"),
      birth_date: getFieldValue(form, "birth_date"),
      university: getFieldValue(form, "university"),
      high_school: getFieldValue(form, "high_school"),
      specialization: getFieldValue(form, "specialization"),
      bank_account: getFieldValue(form, "bank_account"),
      bank_qr_link: getFieldValue(form, "bank_qr_link"),
    };
    updateStaffMutation.mutate(payload);
  };

  const handleSubmitStudent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const birthYear = getFieldValue(form, "birth_year");
    const gender = getFieldValue(form, "gender") as
      | "male"
      | "female"
      | undefined;

    const payload: UpdateMyStudentProfileDto = {
      full_name: getFieldValue(form, "full_name"),
      email: getFieldValue(form, "email"),
      school: getFieldValue(form, "school"),
      province: getFieldValue(form, "province"),
      birth_year: birthYear ? Number(birthYear) : undefined,
      parent_name: getFieldValue(form, "parent_name"),
      parent_phone: getFieldValue(form, "parent_phone"),
      gender,
      goal: getFieldValue(form, "goal"),
    };
    updateStudentMutation.mutate(payload);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !profile) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return <ErrorState status={status} />;
  }

  const accountCompletion = getCompletionStats([
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.phone,
    profile.accountHandle,
    profile.province,
  ]);

  const staffCompletion = profile.staffInfo
    ? getCompletionStats([
        profile.staffInfo.fullName,
        profile.staffInfo.birthDate,
        profile.staffInfo.university,
        profile.staffInfo.highSchool,
        profile.staffInfo.specialization,
        profile.staffInfo.bankAccount,
        profile.staffInfo.bankQrLink,
        profile.staffInfo.status,
        profile.staffInfo.roles,
      ])
    : null;

  const studentCompletion = profile.studentInfo
    ? getCompletionStats([
        profile.studentInfo.fullName,
        profile.studentInfo.email,
        profile.studentInfo.school,
        profile.studentInfo.province,
        profile.studentInfo.birthYear,
        profile.studentInfo.parentName,
        profile.studentInfo.parentPhone,
        profile.studentInfo.gender,
        profile.studentInfo.goal,
        profile.studentInfo.status,
      ])
    : null;

  const allProfileValues: Array<unknown> = [
    profile.first_name,
    profile.last_name,
    profile.email,
    profile.phone,
    profile.accountHandle,
    profile.province,
  ];

  if (profile.staffInfo) {
    allProfileValues.push(
      profile.staffInfo.fullName,
      profile.staffInfo.birthDate,
      profile.staffInfo.university,
      profile.staffInfo.highSchool,
      profile.staffInfo.specialization,
      profile.staffInfo.bankAccount,
      profile.staffInfo.bankQrLink,
      profile.staffInfo.status,
      profile.staffInfo.roles
    );
  }

  if (profile.studentInfo) {
    allProfileValues.push(
      profile.studentInfo.fullName,
      profile.studentInfo.email,
      profile.studentInfo.school,
      profile.studentInfo.province,
      profile.studentInfo.birthYear,
      profile.studentInfo.parentName,
      profile.studentInfo.parentPhone,
      profile.studentInfo.gender,
      profile.studentInfo.goal,
      profile.studentInfo.status
    );
  }

  const overallCompletion = getCompletionStats(allProfileValues);
  const sectionItems: SectionItem[] = [
    {
      id: "profile-account",
      label: "Tài khoản",
      description: "Định danh, liên hệ và handle sử dụng trong hệ thống.",
      completion: accountCompletion,
      tone: "primary",
    },
    ...(profile.staffInfo
      ? [
          {
            id: "profile-staff",
            label: "Nhân sự",
            description: "Hồ sơ học vấn, chuyên môn và thông tin thanh toán.",
            completion: staffCompletion!,
            tone: "success" as const,
          },
        ]
      : []),
    ...(profile.studentInfo
      ? [
          {
            id: "profile-student",
            label: "Học viên",
            description: "Thông tin học tập, phụ huynh và mục tiêu cá nhân.",
            completion: studentCompletion!,
            tone: "warning" as const,
          },
        ]
      : []),
  ];

  const missingItems = [
    !profile.phone && {
      label: "Bổ sung số điện thoại",
      href: "#profile-account",
      detail: "Giúp trung tâm liên hệ nhanh khi cần xác nhận lịch hoặc hỗ trợ.",
    },
    !profile.province && {
      label: "Cập nhật tỉnh/thành",
      href: "#profile-account",
      detail: "Hữu ích cho phân nhóm lớp, khu vực học và báo cáo vận hành.",
    },
    profile.staffInfo && !profile.staffInfo.bankAccount && {
      label: "Thêm tài khoản ngân hàng",
      href: "#profile-staff",
      detail: "Cần thiết để hoàn thiện luồng thanh toán cho nhân sự.",
    },
    profile.staffInfo && !profile.staffInfo.specialization && {
      label: "Điền chuyên ngành",
      href: "#profile-staff",
      detail: "Làm rõ năng lực chuyên môn và thuận tiện khi phân công công việc.",
    },
    profile.studentInfo && !profile.studentInfo.goal && {
      label: "Xác định mục tiêu học tập",
      href: "#profile-student",
      detail: "Giúp giáo viên và phụ huynh theo dõi tiến độ theo đúng kỳ vọng.",
    },
    profile.studentInfo && !profile.studentInfo.parentPhone && {
      label: "Bổ sung liên hệ phụ huynh",
      href: "#profile-student",
      detail: "Quan trọng cho nhắc lịch, phản hồi và xử lý các tình huống khẩn.",
    },
  ].filter(Boolean) as Array<{ label: string; href: string; detail: string }>;

  const contactFacts = [
    {
      label: "Email chính",
      value: profile.email ?? profile.studentInfo?.email ?? "Chưa cập nhật",
    },
    {
      label: "Liên hệ",
      value: profile.phone ?? profile.studentInfo?.parentPhone ?? "Chưa cập nhật",
    },
    {
      label: "Khu vực",
      value: profile.province ?? profile.studentInfo?.province ?? "Chưa cập nhật",
    },
  ];

  const profileNarrative = profile.studentInfo
    ? "Không gian hồ sơ tập trung cho học viên, phụ huynh và mục tiêu học tập. Mọi thông tin quan trọng đều nằm trong một bảng điều phối duy nhất."
    : profile.staffInfo
      ? "Bảng điều phối nhân sự tập trung, giúp bạn rà soát thông tin học vấn, chuyên môn và dữ liệu thanh toán theo một cấu trúc rõ ràng."
      : "Trung tâm hồ sơ cá nhân dành cho thông tin định danh, liên hệ và vai trò vận hành trong hệ thống Unicorns Edu.";

  const accountDetails: DetailItem[] = [
    {
      label: "Họ tên hiển thị",
      value: displayName(profile),
      hint: "Tên này được dùng cho trải nghiệm hồ sơ và hiển thị trong giao diện.",
    },
    { label: "Email", value: profile.email ?? "—" },
    { label: "Số điện thoại", value: profile.phone ?? "—" },
    {
      label: "Account handle",
      value: profile.accountHandle ? `@${profile.accountHandle}` : "—",
    },
    { label: "Tỉnh / Thành phố", value: profile.province ?? "—" },
    { label: "Vai trò", value: getRoleLabel(profile.roleType) },
  ];

  const staffDetails: DetailItem[] | null = profile.staffInfo
    ? [
        { label: "Họ tên", value: profile.staffInfo.fullName ?? "—" },
        { label: "Ngày sinh", value: formatDate(profile.staffInfo.birthDate) },
        { label: "Trường đại học", value: profile.staffInfo.university ?? "—" },
        { label: "Trường THPT", value: profile.staffInfo.highSchool ?? "—" },
        { label: "Chuyên ngành", value: profile.staffInfo.specialization ?? "—" },
        { label: "Số tài khoản", value: profile.staffInfo.bankAccount ?? "—" },
        {
          label: "Trạng thái",
          value: humanizeToken(profile.staffInfo.status) ?? "—",
        },
        {
          label: "Vai trò đảm nhiệm",
          value: profile.staffInfo.roles?.length
            ? profile.staffInfo.roles.map(humanizeToken).join(", ")
            : "—",
          fullWidth: true,
        },
      ]
    : null;

  const studentDetails: DetailItem[] | null = profile.studentInfo
    ? [
        { label: "Họ tên", value: profile.studentInfo.fullName ?? "—" },
        { label: "Email", value: profile.studentInfo.email ?? "—" },
        { label: "Trường", value: profile.studentInfo.school ?? "—" },
        {
          label: "Tỉnh / Thành phố",
          value: profile.studentInfo.province ?? "—",
        },
        { label: "Năm sinh", value: profile.studentInfo.birthYear ?? "—" },
        {
          label: "Phụ huynh",
          value: profile.studentInfo.parentName ?? "—",
          hint: profile.studentInfo.parentPhone
            ? `Liên hệ: ${profile.studentInfo.parentPhone}`
            : "Chưa có số điện thoại phụ huynh.",
        },
        { label: "Giới tính", value: getGenderLabel(profile.studentInfo.gender) },
        {
          label: "Trạng thái",
          value: humanizeToken(profile.studentInfo.status),
        },
        {
          label: "Mục tiêu học tập",
          value: profile.studentInfo.goal ?? "—",
          fullWidth: true,
        },
      ]
    : null;

  return (
    <div className="min-h-screen overflow-hidden bg-bg-primary">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,var(--ue-secondary),transparent_42%),radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--ue-primary)_18%,transparent),transparent_34%),linear-gradient(180deg,var(--ue-bg-secondary),transparent_80%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,var(--ue-border-default)_1px,transparent_1px),linear-gradient(to_bottom,var(--ue-border-default)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(180deg,black,transparent_88%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section
          className={`${softCardClassName} motion-fade-up relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8`}
          style={{
            backgroundImage:
              "radial-gradient(circle at top right, color-mix(in srgb, var(--ue-primary) 16%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--ue-bg-surface) 88%, var(--ue-bg-secondary)), var(--ue-bg-surface))",
          }}
        >
          <div className="absolute inset-y-0 right-0 hidden w-1/3 border-l border-dashed border-border-default/80 lg:block" />
          <div className="grid gap-8 lg:grid-cols-[1.45fr_0.75fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Tag label="Profile Cockpit" tone="primary" />
                <Tag label={getRoleLabel(profile.roleType)} tone="neutral" />
                <Link href="/" className={ghostButtonClassName}>
                  ← Về trang chủ
                </Link>
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-text-primary sm:text-5xl lg:text-[3.6rem]">
                {displayName(profile)}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
                {profileNarrative}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {contactFacts.map((fact, index) => (
                  <div
                    key={fact.label}
                    className="motion-fade-up"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <QuickFact label={fact.label} value={fact.value} />
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {sectionItems.map((item) => (
                  <Link key={item.id} href={`#${item.id}`} className={ghostButtonClassName}>
                    Đi tới {item.label.toLowerCase()}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute -right-6 top-4 hidden h-28 w-28 rounded-full blur-3xl lg:block"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--ue-primary) 16%, transparent)",
                }}
              />
              <div className="rounded-[30px] border border-border-default bg-bg-primary p-5 shadow-[0_24px_90px_-42px_rgba(15,23,42,0.45)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                      Hồ sơ định danh
                    </p>
                    <p className="mt-2 text-sm font-medium text-text-primary">
                      {profile.accountHandle ? `@${profile.accountHandle}` : "Chưa có handle"}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {profile.email ?? "Chưa có email"}
                    </p>
                  </div>
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border-default bg-bg-surface text-2xl font-semibold tracking-[0.18em] text-text-primary">
                    <div className="absolute inset-2 rounded-full border border-dashed border-border-default" />
                    <span className="relative">{getInitials(profile)}</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <MetricCard
                    label="Hoàn thiện"
                    value={`${overallCompletion.percentage}%`}
                    tone="primary"
                  />
                  <MetricCard
                    label="Khối hồ sơ"
                    value={`${sectionItems.length}`}
                    tone="success"
                  />
                  <MetricCard
                    label="Thiếu cập nhật"
                    value={`${missingItems.length}`}
                    tone="warning"
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-border-default bg-bg-surface p-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                    <span>Profile readiness</span>
                    <span>{overallCompletion.filled}/{overallCompletion.total}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${overallCompletion.percentage}%`,
                        background:
                          "linear-gradient(90deg, var(--ue-primary), var(--ue-info))",
                      }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    Mọi thay đổi trên trang này sẽ cập nhật trực tiếp hồ sơ dùng cho
                    vận hành, liên hệ và theo dõi tiến độ trong hệ thống.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <div className={`${softCardClassName} motion-fade-up p-5`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                Điều hướng hồ sơ
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                Bức tranh tổng quan
              </h2>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                Theo dõi ngay phần nào đã đủ dữ liệu và phần nào cần ưu tiên cập nhật.
              </p>

              <div className="mt-5 space-y-3">
                {sectionItems.map((item) => (
                  <SectionProgress key={item.id} href={`#${item.id}`} {...item} />
                ))}
              </div>
            </div>

            <div className={`${softCardClassName} motion-fade-up p-5`} style={{ animationDelay: "90ms" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                Ưu tiên cập nhật
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                Gợi ý tiếp theo
              </h2>

              {missingItems.length ? (
                <div className="mt-5 space-y-3">
                  {missingItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block rounded-2xl border border-border-default bg-bg-primary p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-focus hover:bg-bg-secondary"
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-2 rounded-full bg-warning" />
                        <p className="text-sm font-semibold text-text-primary">
                          {item.label}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {item.detail}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-border-default bg-bg-primary p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    Hồ sơ đang ở trạng thái rất tốt.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Hiện không còn mục quan trọng nào bị thiếu trong bộ dữ liệu chính.
                  </p>
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <ProfileSection
              id="profile-account"
              eyebrow="Phần 01"
              title="Thông tin tài khoản"
              description="Đây là lớp dữ liệu gốc dùng cho định danh người dùng, liên hệ chính và các màn hình cá nhân hóa trong hệ thống."
              tone="primary"
              completion={accountCompletion}
              isEditing={editUser}
              onEdit={() => setEditUser(true)}
            >
              {editUser ? (
                <form onSubmit={handleSubmitUser} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      id="user-first_name"
                      name="first_name"
                      label="Tên"
                      defaultValue={profile.first_name ?? ""}
                      placeholder="Ví dụ: An"
                      autoComplete="given-name"
                    />
                    <TextField
                      id="user-last_name"
                      name="last_name"
                      label="Họ và tên đệm"
                      defaultValue={profile.last_name ?? ""}
                      placeholder="Ví dụ: Nguyễn Văn"
                      autoComplete="family-name"
                    />
                    <TextField
                      id="user-email"
                      name="email"
                      label="Email"
                      type="email"
                      defaultValue={profile.email ?? ""}
                      placeholder="email@example.com"
                      autoComplete="email"
                    />
                    <TextField
                      id="user-phone"
                      name="phone"
                      label="Số điện thoại"
                      type="tel"
                      defaultValue={profile.phone ?? ""}
                      placeholder="0901234567"
                      autoComplete="tel"
                    />
                    <TextField
                      id="user-accountHandle"
                      name="accountHandle"
                      label="Account handle"
                      defaultValue={profile.accountHandle ?? ""}
                      placeholder="nguyenvana"
                      autoComplete="username"
                    />
                    <TextField
                      id="user-province"
                      name="province"
                      label="Tỉnh / Thành phố"
                      defaultValue={profile.province ?? ""}
                      placeholder="TP. HCM"
                      autoComplete="address-level1"
                    />
                  </div>

                  <FormActions
                    pending={updateProfileMutation.isPending}
                    onCancel={() => setEditUser(false)}
                  />
                </form>
              ) : (
                <DetailGrid items={accountDetails} />
              )}
            </ProfileSection>

            {profile.staffInfo ? (
              <ProfileSection
                id="profile-staff"
                eyebrow="Phần 02"
                title="Thông tin nhân sự"
                description="Khối dữ liệu này phục vụ cho quản trị nhân sự, phân công công việc và các quy trình thanh toán nội bộ."
                tone="success"
                completion={staffCompletion!}
                isEditing={editStaff}
                onEdit={() => setEditStaff(true)}
              >
                {editStaff ? (
                  <form onSubmit={handleSubmitStaff} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        id="staff-full_name"
                        name="full_name"
                        label="Họ tên đầy đủ"
                        defaultValue={profile.staffInfo.fullName ?? ""}
                      />
                      <TextField
                        id="staff-birth_date"
                        name="birth_date"
                        label="Ngày sinh"
                        type="date"
                        defaultValue={
                          profile.staffInfo.birthDate
                            ? new Date(profile.staffInfo.birthDate)
                                .toISOString()
                                .slice(0, 10)
                            : ""
                        }
                      />
                      <TextField
                        id="staff-university"
                        name="university"
                        label="Trường đại học"
                        defaultValue={profile.staffInfo.university ?? ""}
                      />
                      <TextField
                        id="staff-high_school"
                        name="high_school"
                        label="Trường THPT"
                        defaultValue={profile.staffInfo.highSchool ?? ""}
                      />
                      <TextField
                        id="staff-specialization"
                        name="specialization"
                        label="Chuyên ngành"
                        defaultValue={profile.staffInfo.specialization ?? ""}
                      />
                      <TextField
                        id="staff-bank_account"
                        name="bank_account"
                        label="Số tài khoản ngân hàng"
                        defaultValue={profile.staffInfo.bankAccount ?? ""}
                      />
                      <div className="sm:col-span-2">
                        <TextField
                          id="staff-bank_qr_link"
                          name="bank_qr_link"
                          label="Link QR ngân hàng"
                          type="url"
                          defaultValue={profile.staffInfo.bankQrLink ?? ""}
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <FormActions
                      pending={updateStaffMutation.isPending}
                      onCancel={() => setEditStaff(false)}
                    />
                  </form>
                ) : (
                  <DetailGrid items={staffDetails ?? []} />
                )}
              </ProfileSection>
            ) : null}

            {profile.studentInfo ? (
              <ProfileSection
                id="profile-student"
                eyebrow={profile.staffInfo ? "Phần 03" : "Phần 02"}
                title="Thông tin học viên"
                description="Khối dữ liệu này giúp đồng bộ liên hệ phụ huynh, hồ sơ học tập và mục tiêu cần theo dõi trong suốt lộ trình học."
                tone="warning"
                completion={studentCompletion!}
                isEditing={editStudent}
                onEdit={() => setEditStudent(true)}
              >
                {editStudent ? (
                  <form onSubmit={handleSubmitStudent} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        id="student-full_name"
                        name="full_name"
                        label="Họ tên đầy đủ"
                        defaultValue={profile.studentInfo.fullName ?? ""}
                      />
                      <TextField
                        id="student-email"
                        name="email"
                        label="Email"
                        type="email"
                        defaultValue={profile.studentInfo.email ?? ""}
                      />
                      <TextField
                        id="student-school"
                        name="school"
                        label="Trường"
                        defaultValue={profile.studentInfo.school ?? ""}
                      />
                      <TextField
                        id="student-province"
                        name="province"
                        label="Tỉnh / Thành phố"
                        defaultValue={profile.studentInfo.province ?? ""}
                      />
                      <TextField
                        id="student-birth_year"
                        name="birth_year"
                        label="Năm sinh"
                        type="number"
                        min={1900}
                        max={new Date().getFullYear()}
                        defaultValue={profile.studentInfo.birthYear ?? ""}
                      />
                      <SelectField
                        id="student-gender"
                        name="gender"
                        label="Giới tính"
                        defaultValue={profile.studentInfo.gender ?? "male"}
                        options={[
                          { value: "male", label: "Nam" },
                          { value: "female", label: "Nữ" },
                        ]}
                      />
                      <TextField
                        id="student-parent_name"
                        name="parent_name"
                        label="Tên phụ huynh"
                        defaultValue={profile.studentInfo.parentName ?? ""}
                      />
                      <TextField
                        id="student-parent_phone"
                        name="parent_phone"
                        label="SĐT phụ huynh"
                        type="tel"
                        defaultValue={profile.studentInfo.parentPhone ?? ""}
                      />
                      <div className="sm:col-span-2">
                        <TextField
                          id="student-goal"
                          name="goal"
                          label="Mục tiêu học tập"
                          defaultValue={profile.studentInfo.goal ?? ""}
                          placeholder="Ví dụ: 7.5 IELTS hoặc đỗ chuyên Tin"
                        />
                      </div>
                    </div>

                    <FormActions
                      pending={updateStudentMutation.isPending}
                      onCancel={() => setEditStudent(false)}
                    />
                  </form>
                ) : (
                  <DetailGrid items={studentDetails ?? []} />
                )}
              </ProfileSection>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
