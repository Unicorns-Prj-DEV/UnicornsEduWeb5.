import type { UserRoleType, UserStatus } from "@/dtos/user.dto";

/** Nhãn hiển thị cho role_type trên user (phân quyền chính). */
export const USER_ROLE_LABELS: Record<UserRoleType, string> = {
  admin: "Admin",
  staff: "Nhân sự",
  student: "Học sinh",
  guest: "Khách",
};

/** Nhãn hiển thị cho trạng thái user. */
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Hoạt động",
  inactive: "Ngừng",
  pending: "Chờ duyệt",
};
