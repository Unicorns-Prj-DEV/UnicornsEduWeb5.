import {
  STUDENT_DROP_OUT_REASON_GROUP_LABELS,
  STUDENT_DROP_OUT_REASON_GROUP_UNCLASSIFIED_LABEL,
  STUDENT_DROP_OUT_REASON_MAX_LENGTH,
  type StudentDropOutReasonGroup,
  type StudentStatus,
} from "@/dtos/student.dto";

export function isMarkingStudentInactive(
  currentStatus: StudentStatus,
  nextStatus: StudentStatus,
): boolean {
  return currentStatus !== "inactive" && nextStatus === "inactive";
}

function getDropOutReasonLengthError(trimmed: string): string | null {
  return trimmed.length > STUDENT_DROP_OUT_REASON_MAX_LENGTH
    ? `Lý do tối đa ${STUDENT_DROP_OUT_REASON_MAX_LENGTH} ký tự.`
    : null;
}

/**
 * Lỗi của lý do + nhóm điền bù (học sinh đã nghỉ), hoặc `null` nếu hợp lệ.
 * Popup nhắc chỉ đóng được dòng khi có đủ cả hai.
 */
export function validateBackfilledDropOutReason(params: {
  reason: string;
  group: StudentDropOutReasonGroup | "";
}): string | null {
  if (!params.group) return "Chọn nhóm lý do nghỉ trước khi lưu.";
  const trimmed = params.reason.trim();
  if (!trimmed) return "Nhập lý do nghỉ trước khi lưu.";
  return getDropOutReasonLengthError(trimmed);
}

/**
 * Lỗi của lý do nghỉ học trên form, hoặc `null` nếu hợp lệ. Chuyển sang nghỉ học
 * bắt buộc chọn nhóm và nhập lý do; các trường hợp khác không bắt buộc nhưng lý do
 * vẫn giới hạn độ dài.
 */
export function validateStudentDropOutReason(params: {
  currentStatus: StudentStatus;
  nextStatus: StudentStatus;
  reason: string;
  group: StudentDropOutReasonGroup | "";
}): string | null {
  const trimmed = params.reason.trim();
  const markingInactive = isMarkingStudentInactive(
    params.currentStatus,
    params.nextStatus,
  );
  if (markingInactive && !params.group) {
    return "Chuyển học sinh sang nghỉ học phải chọn nhóm lý do nghỉ.";
  }
  if (markingInactive && !trimmed) {
    return "Chuyển học sinh sang nghỉ học phải nhập lý do nghỉ.";
  }
  return getDropOutReasonLengthError(trimmed);
}

/** Nhãn nhóm lý do nghỉ; dữ liệu cũ chưa có nhóm hiện «Chưa phân loại». */
export function formatDropOutReasonGroup(
  group: StudentDropOutReasonGroup | null | undefined,
): string {
  return group
    ? STUDENT_DROP_OUT_REASON_GROUP_LABELS[group]
    : STUDENT_DROP_OUT_REASON_GROUP_UNCLASSIFIED_LABEL;
}
