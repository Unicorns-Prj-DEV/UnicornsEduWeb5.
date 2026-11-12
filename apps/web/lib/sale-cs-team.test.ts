import { describe, expect, it } from "vitest";
import {
  formatCustomerCarePercent,
  getNonTeamRoles,
  getSaleCsTeamRoles,
  hasAnyRoleAfterTeamChange,
  isRemovingCustomerCareWithStudents,
} from "./sale-cs-team";

describe("sale-cs-team (#271)", () => {
  it("tách role Sale/CSKH và role khác", () => {
    const roles = ["teacher", "customer_care", "sale"];
    expect(getSaleCsTeamRoles(roles)).toEqual(["sale", "customer_care"]);
    expect(getNonTeamRoles(roles)).toEqual(["teacher"]);
  });

  it("phải còn ít nhất một role", () => {
    expect(hasAnyRoleAfterTeamChange(["sale"], [])).toBe(false);
    expect(hasAnyRoleAfterTeamChange(["sale", "teacher"], [])).toBe(true);
    expect(hasAnyRoleAfterTeamChange(["sale"], ["customer_care"])).toBe(true);
  });

  it("cảnh báo tắt CSKH khi còn học sinh", () => {
    expect(
      isRemovingCustomerCareWithStudents({
        currentRoles: ["customer_care", "sale"],
        selected: ["sale"],
        customerCareStudentCount: 2,
      }),
    ).toBe(true);
    expect(
      isRemovingCustomerCareWithStudents({
        currentRoles: ["customer_care", "sale"],
        selected: ["sale"],
        customerCareStudentCount: 0,
      }),
    ).toBe(false);
    expect(
      isRemovingCustomerCareWithStudents({
        currentRoles: ["customer_care"],
        selected: ["customer_care"],
        customerCareStudentCount: 5,
      }),
    ).toBe(false);
  });

  it("định dạng % CSKH", () => {
    expect(formatCustomerCarePercent(0.25)).toBe("25%");
    expect(formatCustomerCarePercent(0.075)).toBe("7.5%");
    expect(formatCustomerCarePercent(null)).toBe("—");
  });
});
