import { describe, expect, it } from "vitest";
import {
  MONTHLY_REPORT_NONE_KEY,
  buildMonthlyReportMatrix,
  formatEarlyDropBreakdown,
  formatMillions,
  formatSignedCount,
} from "./monthly-report";

describe("buildMonthlyReportMatrix", () => {
  const view = buildMonthlyReportMatrix(
    [
      { customerSource: "referral", courseId: "c-basic", newCount: 1, earlyDropCount: 0, earlyDropOldCount: 0, paidCount: 1, totalTopUp: 2_000_000 },
      { customerSource: "tiktok", courseId: "c-basic", newCount: 2, earlyDropCount: 1, earlyDropOldCount: 1, paidCount: 2, totalTopUp: 3_500_000 },
      { customerSource: null, courseId: null, newCount: 1, earlyDropCount: 0, earlyDropOldCount: 0, paidCount: 0, totalTopUp: 0 },
    ],
    ["c-basic", "c-adv"],
  );

  it("orders rows by source enum, unassigned source last, and appends the unplaced column", () => {
    expect(view.rowKeys).toEqual(["tiktok", "referral", MONTHLY_REPORT_NONE_KEY]);
    expect(view.columnKeys).toEqual(["c-basic", "c-adv", MONTHLY_REPORT_NONE_KEY]);
  });

  it("sums rows, columns and grand total", () => {
    expect(view.cell("tiktok", "c-basic").earlyDropCount).toBe(1);
    expect(view.cell("tiktok", "c-adv").newCount).toBe(0);
    expect(view.columnTotal("c-basic")).toMatchObject({ newCount: 3, totalTopUp: 5_500_000 });
    expect(view.rowTotal(MONTHLY_REPORT_NONE_KEY).newCount).toBe(1);
    expect(view.grandTotal).toEqual({ newCount: 4, earlyDropCount: 1, earlyDropOldCount: 1, paidCount: 3, totalTopUp: 5_500_000 });
    expect(view.maxCellTopUp).toBe(3_500_000);
  });

  it("omits the unplaced column when every new student has a class", () => {
    expect(buildMonthlyReportMatrix([], ["c-basic"]).columnKeys).toEqual(["c-basic"]);
  });
});

describe("monthly report formatters", () => {
  it("formats money in millions above one million", () => {
    expect(formatMillions(12_500_000)).toBe("12,5 tr");
    expect(formatMillions(500_000)).toBe("500.000 đ");
  });

  it("formats signed counts with a real minus sign", () => {
    expect(formatSignedCount(3)).toBe("+3");
    expect(formatSignedCount(-2)).toBe("−2");
    expect(formatSignedCount(0)).toBe("0");
  });

  it("splits early drops into old and trial dropped students", () => {
    expect(formatEarlyDropBreakdown(3, 2)).toBe("2 cũ · 1 thử");
    expect(formatEarlyDropBreakdown(0, 0)).toBeNull();
  });
});
