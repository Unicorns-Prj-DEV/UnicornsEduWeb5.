import { describe, expect, it } from "vitest";
import type { StaffFixedSalaryRoleRow } from "@/dtos/fixed-salary-settings.dto";
import {
  collectDisabledRoleOverrideWarnings,
  formatDisabledRoleOverrideWarningLine,
  LOCKED_FIXED_SALARY_MONTH_NOTE,
} from "./fixed-salary-settings.helpers";

const ROLE_LABELS = { teacher: "Giáo viên", assistant: "Trợ lí" };

function axis(params: {
  hasOverride: boolean;
  overrideValue?: number | null;
}): StaffFixedSalaryRoleRow["amount"] {
  return {
    applied: params.overrideValue ?? null,
    source: params.hasOverride ? "override" : "unconfigured",
    hasOverride: params.hasOverride,
    overrideValue: params.hasOverride ? (params.overrideValue ?? 0) : null,
    roleDefaultValue: null,
  };
}

describe("collectDisabledRoleOverrideWarnings", () => {
  it("asks only when a currently held role with a persisted override is turned off", () => {
    const roleRows: StaffFixedSalaryRoleRow[] = [
      {
        roleType: "teacher",
        amount: axis({ hasOverride: true, overrideValue: 12_000_000 }),
        operatingRate: axis({ hasOverride: true, overrideValue: 15 }),
      },
      {
        roleType: "assistant",
        amount: axis({ hasOverride: false }),
        operatingRate: axis({ hasOverride: false }),
      },
    ];

    const warnings = collectDisabledRoleOverrideWarnings({
      originalRoles: ["teacher", "assistant"],
      nextRoles: ["assistant"],
      roleRows,
      roleLabels: ROLE_LABELS,
    });

    expect(warnings).toEqual([
      {
        roleType: "teacher",
        roleLabel: "Giáo viên",
        hasAmountOverride: true,
        hasRateOverride: true,
        amountOverride: 12_000_000,
        operatingRateOverride: 15,
      },
    ]);
    expect(formatDisabledRoleOverrideWarningLine(warnings[0])).toBe(
      "Tắt vai trò Giáo viên sẽ xóa mức đè lương cứng 12.000.000đ và % vận hành 15%.",
    );
    expect(LOCKED_FIXED_SALARY_MONTH_NOTE).toContain("đã chốt");
  });

  it("does not ask when the disabled role has no override on either axis", () => {
    const warnings = collectDisabledRoleOverrideWarnings({
      originalRoles: ["teacher"],
      nextRoles: [],
      roleRows: [
        {
          roleType: "teacher",
          amount: axis({ hasOverride: false }),
          operatingRate: axis({ hasOverride: false }),
        },
      ],
      roleLabels: ROLE_LABELS,
    });

    expect(warnings).toEqual([]);
  });

  it("still asks when only one axis has an override, including intentional 0", () => {
    const warnings = collectDisabledRoleOverrideWarnings({
      originalRoles: ["teacher"],
      nextRoles: [],
      roleRows: [
        {
          roleType: "teacher",
          amount: axis({ hasOverride: true, overrideValue: 0 }),
          operatingRate: axis({ hasOverride: false }),
        },
      ],
      roleLabels: ROLE_LABELS,
    });

    expect(warnings).toHaveLength(1);
    expect(formatDisabledRoleOverrideWarningLine(warnings[0])).toBe(
      "Tắt vai trò Giáo viên sẽ xóa mức đè lương cứng 0đ và % vận hành không có mức đè.",
    );
  });
});
