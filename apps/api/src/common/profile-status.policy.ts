import { BadRequestException } from '@nestjs/common';
import { StaffStatus, StudentStatus } from '../../generated/enums';

export const INACTIVE_STUDENT_PROFILE_MESSAGE =
  'Học sinh đang ở trạng thái nghỉ học.';
export const INACTIVE_STAFF_PROFILE_MESSAGE =
  'Nhân sự đang ở trạng thái ngừng hoạt động.';

export function isActiveStudentProfile(
  status: StudentStatus | string | null | undefined,
): boolean {
  return status === StudentStatus.active;
}

export function isActiveStaffProfile(
  status: StaffStatus | string | null | undefined,
): boolean {
  return status === StaffStatus.active;
}

export function assertStudentCanJoinActiveWorkflow(
  status: StudentStatus | string | null | undefined,
) {
  if (!isActiveStudentProfile(status)) {
    throw new BadRequestException(INACTIVE_STUDENT_PROFILE_MESSAGE);
  }
}

export function assertStaffCanReceiveAssignment(
  status: StaffStatus | string | null | undefined,
) {
  if (!isActiveStaffProfile(status)) {
    throw new BadRequestException(INACTIVE_STAFF_PROFILE_MESSAGE);
  }
}
