import { SALE_CS_HEAD_ROLE } from 'src/common/sale-cs-head-access';
import { StaffRole } from 'generated/enums';

/** Staff được decorator cây Chuyên đề / Tiết học. Service vẫn `assertCanManageCourse`. */
export const COURSE_TREE_STAFF_ROLES = [
  SALE_CS_HEAD_ROLE,
  StaffRole.teacher,
  StaffRole.lesson_plan,
  StaffRole.lesson_plan_head,
] as const;
