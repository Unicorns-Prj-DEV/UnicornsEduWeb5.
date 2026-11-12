import { describe, expect, it } from "vitest";
import type { UserInfoDto } from "@/dtos/Auth.dto";
import {
  canAccessAdminShellRoute,
  getAdminShellEntryHref,
  resolveAdminShellAccess,
  resolveAdminShellFallbackHref,
} from "./admin-shell-access";

function staffProfile(staffRoles: string[]): UserInfoDto {
  return {
    roleType: "staff",
    staffRoles,
    hasStaffProfile: true,
    staffProfileComplete: true,
  } as unknown as UserInfoDto;
}

const ADMIN_ONLY_REPORT_ROUTES = [
  "/admin",
  "/admin/dashboard",
  "/admin/dashboard/statistics",
  "/admin/monthly-report",
  "/admin/student-statistics",
];

describe("Dashboard / Báo cáo tháng / Thống kê học sinh chỉ Admin (#269)", () => {
  it.each([
    ["Trợ lí / TP Sale & CSKH", ["assistant"]],
    ["Kế toán thu", ["accountant_income"]],
    ["Kế toán chi", ["accountant_expense"]],
    ["Trợ lí kiêm Kế toán thu", ["assistant", "accountant_income"]],
  ])("từ chối %s", (_label, roles) => {
    const access = resolveAdminShellAccess(staffProfile(roles));
    for (const route of ADMIN_ONLY_REPORT_ROUTES) {
      expect(canAccessAdminShellRoute(access, route)).toBe(false);
    }
  });

  it("cho phép users.role_type admin và staff có role admin", () => {
    const accesses = [
      resolveAdminShellAccess({ roleType: "admin" } as unknown as UserInfoDto),
      resolveAdminShellAccess(staffProfile(["admin"])),
    ];
    for (const access of accesses) {
      for (const route of ADMIN_ONLY_REPORT_ROUTES) {
        expect(canAccessAdminShellRoute(access, route)).toBe(true);
      }
    }
  });

  it("Trợ lí không bị đưa về dashboard admin", () => {
    const profile = staffProfile(["assistant"]);
    const access = resolveAdminShellAccess(profile);
    expect(getAdminShellEntryHref(profile)).toBe("/admin/students");
    expect(resolveAdminShellFallbackHref(access, "/admin/dashboard")).toBe(
      "/admin/students",
    );
  });

  it("Kế toán thu vẫn vào được lớp học / học sinh", () => {
    const access = resolveAdminShellAccess(staffProfile(["accountant_income"]));
    expect(canAccessAdminShellRoute(access, "/admin/classes")).toBe(true);
    expect(canAccessAdminShellRoute(access, "/admin/students")).toBe(true);
  });
});
