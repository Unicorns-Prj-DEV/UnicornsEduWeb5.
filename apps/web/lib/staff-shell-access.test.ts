import { describe, expect, it } from "vitest";
import type { UserInfoDto } from "@/dtos/Auth.dto";
import { resolveStaffShellRouteAccess } from "./staff-shell-access";
import { buildStaffRoleDetailHref } from "./admin-shell-paths";

function staffProfile(staffRoles: string[]): UserInfoDto {
  return {
    roleType: "staff",
    staffRoles,
    hasStaffProfile: true,
    staffProfileComplete: true,
  } as unknown as UserInfoDto;
}

describe("route thu nhập Đào Tạo / Trưởng ban đào tạo", () => {
  it("training_head thuần vào /staff/training-head-detail, không vào /staff/training-detail", () => {
    const profile = staffProfile(["training_head"]);
    expect(
      resolveStaffShellRouteAccess(profile, "/staff/training-head-detail")
        .isAllowed,
    ).toBe(true);
    expect(
      resolveStaffShellRouteAccess(profile, "/staff/training-detail").isAllowed,
    ).toBe(false);
  });

  it("training thuần không vào trang của Trưởng ban", () => {
    const profile = staffProfile(["training"]);
    expect(
      resolveStaffShellRouteAccess(profile, "/staff/training-detail").isAllowed,
    ).toBe(true);
    expect(
      resolveStaffShellRouteAccess(profile, "/staff/training-head-detail")
        .isAllowed,
    ).toBe(false);
  });

  it("training_head vẫn có quyền Ban Đào Tạo (lịch, hồ sơ gia sư)", () => {
    const profile = staffProfile(["training_head"]);
    expect(
      resolveStaffShellRouteAccess(profile, "/staff/calendar").isAllowed,
    ).toBe(true);
    expect(
      resolveStaffShellRouteAccess(profile, "/staff/tutors").isAllowed,
    ).toBe(true);
  });

  it("link chi tiết role training_head", () => {
    expect(buildStaffRoleDetailHref("/admin", "training_head", "S1")).toBe(
      "/admin/training_head_detail?staffId=S1",
    );
    expect(buildStaffRoleDetailHref("/staff", "training_head", "S1")).toBe(
      "/staff/training-head-detail?staffId=S1",
    );
  });
});
