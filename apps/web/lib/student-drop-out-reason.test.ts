import { describe, expect, it } from "vitest";
import {
  formatDropOutReasonGroup,
  validateBackfilledDropOutReason,
  validateStudentDropOutReason,
} from "@/lib/student-drop-out-reason";

describe("validateStudentDropOutReason", () => {
  it("bắt buộc lý do khi chuyển sang nghỉ học", () => {
    expect(
      validateStudentDropOutReason({ currentStatus: "active", nextStatus: "inactive", reason: "  ", group: "tuition" }),
    ).toBe("Chuyển học sinh sang nghỉ học phải nhập lý do nghỉ.");
    expect(
      validateStudentDropOutReason({
        currentStatus: "active",
        nextStatus: "inactive",
        reason: "Chuyển trường",
        group: "no_suitable_class",
      }),
    ).toBeNull();
  });

  it("bắt buộc nhóm lý do khi chuyển sang nghỉ học", () => {
    expect(
      validateStudentDropOutReason({
        currentStatus: "active",
        nextStatus: "inactive",
        reason: "Chuyển trường",
        group: "",
      }),
    ).toBe("Chuyển học sinh sang nghỉ học phải chọn nhóm lý do nghỉ.");
  });

  it("không bắt buộc lý do khi học sinh học lại hoặc giữ nguyên trạng thái", () => {
    expect(
      validateStudentDropOutReason({ currentStatus: "inactive", nextStatus: "active", reason: "", group: "" }),
    ).toBeNull();
    expect(
      validateStudentDropOutReason({ currentStatus: "inactive", nextStatus: "inactive", reason: "", group: "" }),
    ).toBeNull();
  });

  it("giới hạn 500 ký tự", () => {
    expect(
      validateStudentDropOutReason({
        currentStatus: "active",
        nextStatus: "inactive",
        reason: "a".repeat(501),
        group: "other",
      }),
    ).toBe("Lý do tối đa 500 ký tự.");
  });
});

describe("validateBackfilledDropOutReason", () => {
  it("bắt buộc chọn nhóm", () => {
    expect(validateBackfilledDropOutReason({ reason: "Bận", group: "" })).toBe(
      "Chọn nhóm lý do nghỉ trước khi lưu.",
    );
  });

  it("bắt buộc lý do khác rỗng", () => {
    expect(validateBackfilledDropOutReason({ reason: "   ", group: "busy_schedule" })).toBe(
      "Nhập lý do nghỉ trước khi lưu.",
    );
  });

  it("giới hạn 500 ký tự sau khi trim", () => {
    expect(
      validateBackfilledDropOutReason({ reason: ` ${"a".repeat(500)} `, group: "other" }),
    ).toBeNull();
    expect(validateBackfilledDropOutReason({ reason: "a".repeat(501), group: "other" })).toBe(
      "Lý do tối đa 500 ký tự.",
    );
  });
});

describe("formatDropOutReasonGroup", () => {
  it("hiện nhãn nhóm, thiếu nhóm thì «Chưa phân loại»", () => {
    expect(formatDropOutReasonGroup("tuition")).toBe("Học phí");
    expect(formatDropOutReasonGroup(null)).toBe("Chưa phân loại");
  });
});
