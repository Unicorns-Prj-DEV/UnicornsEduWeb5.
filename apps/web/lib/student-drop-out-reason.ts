import { STUDENT_DROP_OUT_REASON_MAX_LENGTH, type StudentStatus } from "@/dtos/student.dto";

export function isMarkingStudentInactive(
  currentStatus: StudentStatus,
  nextStatus: StudentStatus,
): boolean {
  return currentStatus !== "inactive" && nextStatus === "inactive";
}

/**
 * Lỗi của lý do nghỉ học trên form, hoặc `null` nếu hợp lệ. Chuyển sang nghỉ học
 * bắt buộc có lý do; các trường hợp khác lý do không bắt buộc nhưng vẫn giới hạn độ dài.
 */
export function validateStudentDropOutReason(params: {
  currentStatus: StudentStatus;
  nextStatus: StudentStatus;
  reason: string;
}): string | null {
  const trimmed = params.reason.trim();
  if (isMarkingStudentInactive(params.currentStatus, params.nextStatus) && !trimmed) {
    return "Chuyển học sinh sang nghỉ học phải nhập lý do nghỉ.";
  }
  if (trimmed.length > STUDENT_DROP_OUT_REASON_MAX_LENGTH) {
    return `Lý do tối đa ${STUDENT_DROP_OUT_REASON_MAX_LENGTH} ký tự.`;
  }
  return null;
}
