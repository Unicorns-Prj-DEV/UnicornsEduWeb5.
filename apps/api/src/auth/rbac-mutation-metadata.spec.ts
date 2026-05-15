import { StaffRole } from 'generated/enums';
import { ALLOW_STAFF_ROLES_ON_ADMIN_KEY } from './decorators/allow-staff-roles-on-admin.decorator';
import { StaffController } from '../staff/staff.controller';
import { StudentController } from '../student/student.controller';
import { UserController } from '../user/user.controller';

function getAllowedStaffRoles(
  controller: { prototype: object },
  methodName: string,
): StaffRole[] | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(
    controller.prototype,
    methodName,
  );
  const methodTarget: unknown = descriptor?.value;

  if (typeof methodTarget !== 'function') {
    throw new Error(`Controller method not found: ${methodName}`);
  }

  const metadata: unknown = Reflect.getMetadata(
    ALLOW_STAFF_ROLES_ON_ADMIN_KEY,
    methodTarget,
  );

  return Array.isArray(metadata) ? (metadata as StaffRole[]) : undefined;
}

describe('RBAC route metadata', () => {
  it.each(['createUser', 'createStudentUser', 'updateUser', 'deleteUser'])(
    'requires full admin for UserController.%s',
    (methodName) => {
      expect(getAllowedStaffRoles(UserController, methodName)).toEqual([]);
    },
  );

  it('requires full admin for staff profile role/link/status updates', () => {
    expect(getAllowedStaffRoles(StaffController, 'updateStaff')).toEqual([]);
  });

  it('keeps assistant access only on staff create/delete helper routes', () => {
    expect(getAllowedStaffRoles(StaffController, 'createStaff')).toEqual([
      StaffRole.assistant,
    ]);
    expect(getAllowedStaffRoles(StaffController, 'deleteStaff')).toEqual([
      StaffRole.assistant,
    ]);
  });

  it('allows scoped staff roles to read student wallet history', () => {
    expect(getAllowedStaffRoles(StudentController, 'getStudentWalletHistory')).toEqual([
      StaffRole.assistant,
      StaffRole.accountant,
      StaffRole.customer_care,
    ]);
  });
});
