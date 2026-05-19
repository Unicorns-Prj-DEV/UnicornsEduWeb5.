import { StaffStatus, StudentStatus } from '../../generated/enums';
import {
  assertStaffCanReceiveAssignment,
  assertStudentCanJoinActiveWorkflow,
  isActiveStaffProfile,
  isActiveStudentProfile,
} from './profile-status.policy';

describe('profile status policy', () => {
  it('treats only active student profiles as active learning profiles', () => {
    expect(isActiveStudentProfile(StudentStatus.active)).toBe(true);
    expect(isActiveStudentProfile(StudentStatus.inactive)).toBe(false);
    expect(() =>
      assertStudentCanJoinActiveWorkflow(StudentStatus.inactive),
    ).toThrow('Học sinh đang ở trạng thái nghỉ học.');
  });

  it('treats only active staff profiles as eligible for new assignments', () => {
    expect(isActiveStaffProfile(StaffStatus.active)).toBe(true);
    expect(isActiveStaffProfile(StaffStatus.inactive)).toBe(false);
    expect(() => assertStaffCanReceiveAssignment(StaffStatus.inactive)).toThrow(
      'Nhân sự đang ở trạng thái ngừng hoạt động.',
    );
  });
});
