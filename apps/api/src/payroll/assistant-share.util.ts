import { Prisma } from 'generated/client';

export function isSelfManagedCustomerCareStaff(params: {
  staffId: string;
  customerCareManagedByStaffId: string | null | undefined;
}): boolean {
  return (
    params.customerCareManagedByStaffId != null &&
    params.customerCareManagedByStaffId === params.staffId
  );
}

export function isSelfManagedAssistantShareAttendance(params: {
  assistantManagerStaffId: string | null | undefined;
  customerCareStaffId: string | null | undefined;
}): boolean {
  return (
    params.assistantManagerStaffId != null &&
    params.customerCareStaffId != null &&
    params.assistantManagerStaffId === params.customerCareStaffId
  );
}

export function resolveAssistantManagerStaffIdForAttendance(params: {
  customerCareStaffId: string | null | undefined;
  customerCareManagedByStaffId: string | null | undefined;
}): string | null {
  const managerId = params.customerCareManagedByStaffId ?? null;
  if (!managerId || !params.customerCareStaffId) {
    return null;
  }
  if (managerId === params.customerCareStaffId) {
    return null;
  }
  return managerId;
}

/** Exclude assistant 3% rows where manager and CSKH are the same staff. */
export const ASSISTANT_SHARE_EXCLUDE_SELF_MANAGED_SQL = Prisma.sql`
  AND (
    attendance.assistant_manager_staff_id IS NULL
    OR attendance.customer_care_staff_id IS NULL
    OR attendance.assistant_manager_staff_id <> attendance.customer_care_staff_id
  )
`;
