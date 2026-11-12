jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { StaffRole, UserRole } from 'generated/enums';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { ClassController } from './class.controller';

/**
 * #272: response route admin của lớp bỏ lương gia sư với Trưởng phòng Sale &
 * CSKH (giữ Học phí lớp), Admin thấy đủ.
 */
describe('ClassController #272 redaction', () => {
  const classDetail = () => ({
    id: 'class-1',
    name: 'Toán 9',
    studentTuitionPerSession: 180000,
    tuitionPackageTotal: 2000000,
    allowancePerSessionPerStudent: 90000,
    scaleAmount: 10000,
    trainingManagerRatePercent: 5,
    teachers: [
      {
        id: 'teacher-1',
        customAllowance: 100000,
        operatingDeductionRatePercent: 10,
      },
    ],
    students: [{ id: 'student-1', customTuitionPerSession: 150000 }],
  });

  const classService = {
    getClassById: jest.fn(),
    updateClassTuition: jest.fn(),
    updateClassStudentTuition: jest.fn(),
  };
  const controller = new ClassController(
    classService as never,
    {} as never,
    {} as never,
  );

  const user = (roleType: UserRole): JwtPayload => ({
    id: 'user-1',
    email: 'user@example.com',
    accountHandle: 'user',
    roleType,
  });
  const req = (staffRoles: StaffRole[]) =>
    ({ resolvedStaffRoles: staffRoles }) as never;

  const headUser = user(UserRole.staff);
  const headReq = req([StaffRole.sale_customer_care_head]);

  beforeEach(() => {
    jest.clearAllMocks();
    classService.getClassById.mockResolvedValue(classDetail());
    classService.updateClassTuition.mockResolvedValue(classDetail());
    classService.updateClassStudentTuition.mockResolvedValue(classDetail());
  });

  const expectNoTeacherPay = (result: Record<string, unknown>) => {
    expect(result).not.toHaveProperty('allowancePerSessionPerStudent');
    expect(result).not.toHaveProperty('scaleAmount');
    expect(result).not.toHaveProperty('trainingManagerRatePercent');
    expect(result.teachers).toEqual([{ id: 'teacher-1' }]);
    expect(result).toHaveProperty('studentTuitionPerSession', 180000);
    expect(result).toHaveProperty('tuitionPackageTotal', 2000000);
  };

  it('Trưởng phòng xem chi tiết lớp không có lương gia sư', async () => {
    const result = await controller.getClassById(headUser, headReq, 'class-1');
    expectNoTeacherPay(result as Record<string, unknown>);
  });

  it('Trưởng phòng sửa Học phí lớp: response không có lương gia sư', async () => {
    const result = await controller.updateClassTuition(
      headUser,
      headReq,
      'class-1',
      { tuition_package_total: 2000000 },
    );
    expect(classService.updateClassTuition).toHaveBeenCalledWith(
      'class-1',
      { tuition_package_total: 2000000 },
      expect.objectContaining({ userId: 'user-1' }),
    );
    expectNoTeacherPay(result as Record<string, unknown>);
  });

  it('Kế toán thu sửa học phí riêng: response không có lương gia sư', async () => {
    const result = await controller.updateClassStudentTuition(
      user(UserRole.staff),
      req([StaffRole.accountant_income]),
      'class-1',
      { student_id: 'student-1', custom_tuition_per_session: 150000 },
    );
    expectNoTeacherPay(result as Record<string, unknown>);
  });

  it('Admin thấy đủ lương gia sư', async () => {
    const result = await controller.getClassById(
      user(UserRole.admin),
      req([]),
      'class-1',
    );
    expect(result).toEqual(classDetail());
  });
});
