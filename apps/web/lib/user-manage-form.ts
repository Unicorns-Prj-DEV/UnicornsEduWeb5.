import type {
  StaffRole,
  UpdateUserPayload,
  UserDetailWithStaff,
  UserRoleType,
  UserStatus,
} from "@/dtos/user.dto";

export const USER_MANAGE_FIELD_ORDER = [
  "accountHandle",
  "email",
  "phone",
  "last_name",
  "first_name",
  "province",
] as const;

export type UserManageField = (typeof USER_MANAGE_FIELD_ORDER)[number];

export type UserManageFormState = {
  accountHandle: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  province: string;
  status: UserStatus;
  emailVerified: boolean;
  roleType: UserRoleType;
  staffRoles: StaffRole[];
};

export type UserManageFormErrors = Partial<Record<UserManageField, string>>;

export function buildUserManageFormState(
  user: UserDetailWithStaff,
): UserManageFormState {
  return {
    accountHandle: user.accountHandle ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    province: user.province ?? "",
    status: (user.status as UserStatus) || "active",
    emailVerified: Boolean(user.emailVerified),
    roleType: user.roleType,
    staffRoles: user.staffInfo?.roles ?? [],
  };
}

export function validateUserManageForm(
  form: UserManageFormState,
): UserManageFormErrors {
  const errors: UserManageFormErrors = {};
  const email = form.email.trim();

  if (!form.accountHandle.trim()) {
    errors.accountHandle = "Vui lòng nhập account handle.";
  }
  if (!email) {
    errors.email = "Vui lòng nhập email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Email không hợp lệ.";
  }

  return errors;
}

export function buildUpdateUserPayload(
  userId: string,
  form: UserManageFormState,
): UpdateUserPayload {
  return {
    id: userId,
    accountHandle: form.accountHandle.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    first_name: form.first_name.trim() || undefined,
    last_name: form.last_name.trim() || undefined,
    province: form.province.trim() || undefined,
    status: form.status,
    emailVerified: form.emailVerified,
    roleType: form.roleType,
    ...(form.roleType === "staff" ? { staffRoles: form.staffRoles } : {}),
  };
}

export function getUserDisplayName(user: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  return [user.last_name, user.first_name].filter(Boolean).join(" ").trim();
}

export function getDeleteUserSoftDeleteNotice(
  user: UserDetailWithStaff,
): string | null {
  const hasStaff = Boolean(user.staffInfo?.id);
  const hasStudent = Boolean(user.studentInfo?.id);

  if (hasStaff && hasStudent) {
    return "Hồ sơ nhân sự và học sinh liên kết sẽ được giữ lại; liên kết tài khoản sẽ bị gỡ (user_id = null).";
  }
  if (hasStaff) {
    return "Hồ sơ nhân sự liên kết sẽ được giữ lại; liên kết tài khoản sẽ bị gỡ (user_id = null).";
  }
  if (hasStudent) {
    return "Hồ sơ học sinh liên kết sẽ được giữ lại; liên kết tài khoản sẽ bị gỡ (user_id = null).";
  }
  return null;
}
