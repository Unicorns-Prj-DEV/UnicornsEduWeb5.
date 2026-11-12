jest.mock('src/calendar/calendar.service', () => ({
  CalendarService: class CalendarServiceMock {},
}));

import { StaffRole } from 'generated/enums';
import { ALLOW_STAFF_ROLES_ON_ADMIN_KEY } from './decorators/allow-staff-roles-on-admin.decorator';
import { BonusController } from '../bonus/bonus.controller';
import { ClassController } from '../class/class.controller';
import { CostController } from '../cost/cost.controller';
import { DeductionSettingsController } from '../deduction-settings/deduction-settings.controller';
import { ExtraAllowanceController } from '../extra-allowance/extra-allowance.controller';
import { StaffController } from '../staff/staff.controller';
import { StudentController } from '../student/student.controller';
import { UserController } from '../user/user.controller';

/**
 * Danh sách staff role được vào admin route, theo đúng cách RolesGuard đọc
 * (`getAllAndOverride`: handler ghi đè class). Không có metadata nào → `[]`
 * (#267: trang quản trị mặc định đóng, chỉ Admin).
 */
function getAllowedStaffRoles(
  controller: { prototype: object },
  methodName: string,
): StaffRole[] {
  const descriptor = Object.getOwnPropertyDescriptor(
    controller.prototype,
    methodName,
  );
  const methodTarget: unknown = descriptor?.value;

  if (typeof methodTarget !== 'function') {
    throw new Error(`Controller method not found: ${methodName}`);
  }

  const handlerMetadata: unknown = Reflect.getMetadata(
    ALLOW_STAFF_ROLES_ON_ADMIN_KEY,
    methodTarget,
  );
  const classMetadata: unknown = Reflect.getMetadata(
    ALLOW_STAFF_ROLES_ON_ADMIN_KEY,
    controller,
  );
  const metadata = handlerMetadata ?? classMetadata;

  return Array.isArray(metadata) ? (metadata as StaffRole[]) : [];
}

describe('RBAC route metadata (#267 deny-by-default)', () => {
  it.each(['createUser', 'updateUser', 'deleteUser'])(
    'keeps UserController.%s admin-only',
    (methodName) => {
      expect(getAllowedStaffRoles(UserController, methodName)).toEqual([]);
    },
  );

  it('allows assistant to set passwords (service limits target to students)', () => {
    expect(getAllowedStaffRoles(UserController, 'setUserPassword')).toEqual([
      StaffRole.sale_customer_care_head,
    ]);
  });

  it('allows assistant and customer care on UserController.createStudentUser', () => {
    expect(getAllowedStaffRoles(UserController, 'createStudentUser')).toEqual([
      StaffRole.sale_customer_care_head,
      StaffRole.customer_care,
    ]);
  });

  it.each(['createStaff', 'updateStaff', 'updateStaffStatus', 'deleteStaff'])(
    'keeps StaffController.%s admin-only',
    (methodName) => {
      expect(getAllowedStaffRoles(StaffController, methodName)).toEqual([]);
    },
  );

  it.each(['updateClassStudents', 'endClass', 'stopClassTeacher'])(
    'keeps ClassController.%s admin-only',
    (methodName) => {
      expect(getAllowedStaffRoles(ClassController, methodName)).toEqual([]);
    },
  );

  it('allows assistant and customer care on student status/profile actions', () => {
    for (const methodName of [
      'updateStudentStatus',
      'updateStudent',
      'updateStudentById',
      'updateStudentExamSchedules',
      'getStudentWalletHistory',
    ]) {
      expect(getAllowedStaffRoles(StudentController, methodName)).toEqual([
        StaffRole.sale_customer_care_head,
        StaffRole.customer_care,
      ]);
    }
  });

  it('allows assistant on student delete and wallet adjustment routes', () => {
    expect(
      getAllowedStaffRoles(StudentController, 'updateStudentAccountBalance'),
    ).toEqual([StaffRole.sale_customer_care_head]);
    expect(getAllowedStaffRoles(StudentController, 'deleteStudent')).toEqual([
      StaffRole.sale_customer_care_head,
    ]);
  });

  it('keeps the direct top-up approval queue admin-only', () => {
    for (const methodName of [
      'listStudentWalletDirectTopUpRequests',
      'getStudentWalletDirectTopUpRequest',
      'approveStudentWalletDirectTopUpRequestFromQueue',
    ]) {
      expect(getAllowedStaffRoles(StudentController, methodName)).toEqual([]);
    }
  });

  it('keeps tax deduction settings admin-only', () => {
    expect(
      getAllowedStaffRoles(
        DeductionSettingsController,
        'updateRoleTaxDeductionRate',
      ),
    ).toEqual([]);
  });

  it.each(['createCost', 'deleteCost'])(
    'allows only expense accountant on CostController.%s',
    (methodName) => {
      expect(getAllowedStaffRoles(CostController, methodName)).toEqual([
        StaffRole.accountant_expense,
      ]);
    },
  );

  it.each(['createBonus', 'deleteBonus'])(
    'allows staff admin and expense accountant on BonusController.%s',
    (methodName) => {
      expect(getAllowedStaffRoles(BonusController, methodName)).toEqual([
        StaffRole.admin,
        StaffRole.accountant_expense,
      ]);
    },
  );

  it.each(['createExtraAllowance', 'deleteExtraAllowance'])(
    'allows only expense accountant on ExtraAllowanceController.%s',
    (methodName) => {
      expect(
        getAllowedStaffRoles(ExtraAllowanceController, methodName),
      ).toEqual([StaffRole.accountant_expense]);
    },
  );
});
