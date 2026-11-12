import { ForbiddenException } from '@nestjs/common';
import { StaffRole } from 'generated/enums';

/**
 * Quyền khu **giáo án học sinh giỏi** (biên bản họp 12/11/2026 mục 8, ticket #279).
 *
 * - Trưởng ban Chuyên môn (`lesson_plan_head`) = quyền quản lý (`canManage`):
 *   tạo/sửa/**xoá** đầu việc (task), sản phẩm (output), tài liệu (resource);
 *   giao việc; cài đặt bậc độ khó, level, hạng mục của sản phẩm.
 * - Ban Chuyên môn thường (`lesson_plan`): không xoá, không cài đặt.
 * - **Chi phí từng sản phẩm của mỗi người**: ngoại lệ duy nhất của luật thu
 *   nhập cá nhân (#270) — Trưởng ban Chuyên môn thấy; Ban Chuyên môn thường chỉ
 *   thấy chi phí của chính mình. Admin và Kế toán chi thấy hết.
 * - Trạng thái thanh toán: Trưởng ban thấy nhưng **không sửa** — chỉ Admin và
 *   Kế toán chi.
 * - Hai luật cứng (#265, chỉ Admin được miễn): không ai tự cài chi phí cho sản
 *   phẩm của chính mình.
 */
export interface LessonPolicyActor {
  staffId: string | null;
  staffRoles: readonly StaffRole[];
  canManage: boolean;
}

function isLessonAdmin(actor: LessonPolicyActor): boolean {
  return actor.staffRoles.includes(StaffRole.admin);
}

/** Xoá đầu việc / sản phẩm / tài liệu: Admin + Trưởng ban Chuyên môn. */
export function canDeleteLessonWork(actor: LessonPolicyActor): boolean {
  return isLessonAdmin(actor) || actor.canManage;
}

export const LESSON_DELETE_FORBIDDEN_MESSAGE =
  'Chỉ Admin và Trưởng ban Chuyên môn được xoá trong khu giáo án.';

export function assertCanDeleteLessonWork(actor: LessonPolicyActor): void {
  if (!canDeleteLessonWork(actor)) {
    throw new ForbiddenException(LESSON_DELETE_FORBIDDEN_MESSAGE);
  }
}

/** Sửa trạng thái thanh toán sản phẩm: chỉ Admin + Kế toán chi. */
export function canEditLessonOutputPaymentStatus(
  actor: LessonPolicyActor,
): boolean {
  return (
    isLessonAdmin(actor) ||
    actor.staffRoles.includes(StaffRole.accountant_expense)
  );
}

/**
 * Xem chi phí (`cost`) của một sản phẩm: Admin, Trưởng ban Chuyên môn, Kế
 * toán chi, hoặc chính người nhận tiền sản phẩm đó.
 */
export function canViewLessonOutputCost(
  actor: LessonPolicyActor,
  outputStaffId: string | null | undefined,
): boolean {
  if (
    isLessonAdmin(actor) ||
    actor.canManage ||
    actor.staffRoles.includes(StaffRole.accountant_expense)
  ) {
    return true;
  }
  return actor.staffId != null && outputStaffId === actor.staffId;
}

export const LESSON_PRICING_FORBIDDEN_MESSAGE =
  'Chỉ Admin và Trưởng ban Chuyên môn được cài đặt bậc độ khó, level và hạng mục của sản phẩm.';
export const LESSON_PRICING_OWN_OUTPUT_FORBIDDEN_MESSAGE =
  'Không được tự cài đặt chi phí (bậc độ khó, level, hạng mục) cho sản phẩm của chính mình — nhờ Admin.';

/**
 * Cài đặt bậc độ khó / level / hạng mục (quyết định `cost`) cho sản phẩm thuộc
 * `outputStaffId`. Admin luôn được; Trưởng ban Chuyên môn được, trừ sản phẩm
 * của chính mình; Ban Chuyên môn thường không được.
 */
export function assertCanSetLessonOutputPricing(
  actor: LessonPolicyActor,
  outputStaffId: string | null | undefined,
): void {
  if (isLessonAdmin(actor)) {
    return;
  }
  if (!actor.canManage) {
    throw new ForbiddenException(LESSON_PRICING_FORBIDDEN_MESSAGE);
  }
  if (actor.staffId != null && outputStaffId === actor.staffId) {
    throw new ForbiddenException(LESSON_PRICING_OWN_OUTPUT_FORBIDDEN_MESSAGE);
  }
}

/** Ẩn `cost` của sản phẩm người khác với người không được xem (`null`). */
export function redactLessonOutputCost<
  T extends { cost: number | null; staffId: string | null },
>(output: T, actor: LessonPolicyActor | null): T {
  if (!actor || canViewLessonOutputCost(actor, output.staffId)) {
    return output;
  }
  return { ...output, cost: null } as T;
}
