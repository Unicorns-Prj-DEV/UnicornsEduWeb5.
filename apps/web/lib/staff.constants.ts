/** Tên workspace task/output (sản phẩm công việc của Ban chuyên môn). Chỉ IT. */
export const LESSON_PLAN_LABEL = "Giáo án học sinh giỏi";

/** Nhãn role `lesson_plan` (Ban chuyên môn). Enum và dữ liệu giữ nguyên. */
export const LESSON_PLAN_ROLE_LABEL = "Chuyên môn";

/** Nhãn role `lesson_plan_head`. */
export const LESSON_PLAN_HEAD_ROLE_LABEL = "Trưởng chuyên môn";

/** Nhãn hiển thị cho role nhân sự (dùng ở list và detail). */
export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Giáo viên",
  assistant: "Trợ lí",
  lesson_plan: LESSON_PLAN_ROLE_LABEL,
  lesson_plan_head: LESSON_PLAN_HEAD_ROLE_LABEL,
  accountant: "Kế toán",
  accountant_income: "Kế toán thu",
  accountant_expense: "Kế toán chi",
  communication: "Truyền thông",
  technical: "Kỹ thuật",
  customer_care: "CSKH",
  training: "Đào Tạo",
  training_head: "Trưởng ban đào tạo",
  sale: "Sale",
};
