jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('../../generated/client', () => ({
  Prisma: {},
}));

import { BadRequestException } from '@nestjs/common';
import { StaffRole, StudentStatus, UserRole } from '../../generated/enums';
import { StudentService } from './student.service';

describe('StudentService', () => {
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    studentInfo: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    customerCareService: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    walletTransactionsHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    studentWalletSepayOrder: {
      create: jest.fn(),
    },
    staffInfo: {
      findUnique: jest.fn(),
    },
    class: {
      findMany: jest.fn(),
    },
    studentClass: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };
  const googleCalendarService = {
    syncStudentExamScheduleEvents: jest.fn(),
  };
  const sePayService = {
    isWalletTopUpConfigured: jest.fn(),
    buildStudentWalletOrderCode: jest.fn(),
    createStudentWalletTopUpPayment: jest.fn(),
  };

  let service: StudentService;

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.SEPAY_TOPUP_MODE;
    delete process.env.SEPAY_API_ACCESS_TOKEN;
    delete process.env.SEPAY_BANK_ACCOUNT_XID;
    delete process.env.SEPAY_TRANSFER_BANK_BIN;
    delete process.env.SEPAY_TRANSFER_ACCOUNT_NUMBER;
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    service = new StudentService(
      mockPrisma as never,
      actionHistoryService as never,
      googleCalendarService as never,
      sePayService as never,
    );
  });

  it('records action history after creating a student', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      province: 'Hanoi',
      roleType: UserRole.guest,
      studentInfo: null,
      staffInfo: null,
    });
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      roleType: UserRole.student,
    });
    mockPrisma.studentInfo.create.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      parentEmail: 'parent@example.com',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      userId: 'user-1',
      accountBalance: 0,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      dropOutDate: null,
      studentClasses: [],
      customerCareServices: null,
    });
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      parentEmail: 'parent@example.com',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      userId: 'user-1',
      accountBalance: 0,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      dropOutDate: null,
      studentClasses: [],
      customerCareServices: null,
    });

    await service.createStudent(
      {
        full_name: 'Nguyen Van A',
        email: 'student@example.com',
        school: 'THPT Nguyen Du',
        province: 'Hanoi',
        birth_year: 2010,
        parent_name: 'Parent A',
        parent_phone: '0900000000',
        status: StudentStatus.active,
        gender: 'male',
        goal: 'Top 1',
        user_id: 'user-1',
      },
      {
        userId: 'admin-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
    );

    expect(actionHistoryService.recordCreate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'student',
        entityId: 'student-1',
      }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
      },
      data: {
        roleType: UserRole.student,
      },
    });
  });

  it('rejects creating a student for a user that already has a staff profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      province: 'Hanoi',
      roleType: UserRole.guest,
      studentInfo: null,
      staffInfo: {
        id: 'staff-1',
      },
    });

    await expect(
      service.createStudent({
        full_name: 'Nguyen Van A',
        user_id: 'user-1',
      }),
    ).rejects.toThrow(
      'User này đang có hồ sơ nhân sự nên không thể gán làm học sinh.',
    );

    expect(mockPrisma.studentInfo.create).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns self detail with read-only tuition fields', async () => {
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      parentEmail: 'parent@example.com',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      accountBalance: 250000,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      dropOutDate: null,
      customerCareServices: {
        staff: {
          id: 'staff-1',
          fullName: 'CSKH A',
          roles: ['customer_care'],
          status: 'active',
        },
        profitPercent: 0.2,
      },
      studentClasses: [
        {
          totalAttendedSession: 6,
          customStudentTuitionPerSession: 100000,
          customTuitionPackageTotal: 900000,
          customTuitionPackageSession: 9,
          class: {
            id: 'class-1',
            name: 'Toan 8A',
            status: 'running',
            tuitionPackageTotal: 1200000,
            tuitionPackageSession: 12,
            studentTuitionPerSession: 100000,
          },
        },
      ],
    });

    const result = await service.getStudentSelfDetail('student-1');

    expect(result).toEqual({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      accountBalance: 250000,
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      status: StudentStatus.active,
      gender: 'male',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      parentEmail: 'parent@example.com',
      goal: 'Top 1',
      studentClasses: [
        {
          class: {
            id: 'class-1',
            name: 'Toan 8A',
            status: 'running',
          },
          customTuitionPerSession: 100000,
          customTuitionPackageTotal: 900000,
          customTuitionPackageSession: 9,
          effectiveTuitionPerSession: 100000,
          effectiveTuitionPackageTotal: 900000,
          effectiveTuitionPackageSession: 9,
          tuitionPackageSource: 'custom',
          totalAttendedSession: 6,
        },
      ],
    });
    expect(result).not.toHaveProperty('customerCare');
    expect(result.parentEmail).toBe('parent@example.com');
    expect(result.studentClasses[0]).toMatchObject({
      effectiveTuitionPerSession: 100000,
      effectiveTuitionPackageTotal: 900000,
      effectiveTuitionPackageSession: 9,
      tuitionPackageSource: 'custom',
    });
  });

  it('blocks self-service negative wallet deltas so students cannot directly withdraw', async () => {
    await expect(
      service.updateMyStudentAccountBalance('student-1', {
        amount: -50000,
      }),
    ).rejects.toThrow('Use SePay');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.walletTransactionsHistory.create).not.toHaveBeenCalled();
    expect(mockPrisma.studentInfo.update).not.toHaveBeenCalled();
  });

  it('blocks self-service positive wallet deltas so self top-ups always use SePay QR', async () => {
    await expect(
      service.updateMyStudentAccountBalance('student-1', {
        amount: 150000,
      }),
    ).rejects.toThrow('Use SePay');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.walletTransactionsHistory.create).not.toHaveBeenCalled();
  });

  it('blocks self-service positive wallet deltas when SePay bank-transfer top-up is configured', async () => {
    process.env.SEPAY_TOPUP_MODE = 'bank_transfer';
    process.env.SEPAY_TRANSFER_BANK_BIN = '970422';
    process.env.SEPAY_TRANSFER_ACCOUNT_NUMBER = '722732006';

    await expect(
      service.updateMyStudentAccountBalance('student-1', {
        amount: 150000,
      }),
    ).rejects.toThrow('Use SePay');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.walletTransactionsHistory.create).not.toHaveBeenCalled();
  });

  it('requires a reason for admin manual balance adjustments', async () => {
    await expect(
      service.updateStudentAccountBalance(
        {
          student_id: 'student-1',
          amount: 150000,
          reason: ' ',
        },
        {
          userId: 'admin-user-1',
          userEmail: 'admin@example.com',
          roleType: UserRole.admin,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.walletTransactionsHistory.create).not.toHaveBeenCalled();
  });

  it('adds the admin manual reason to wallet history notes', async () => {
    mockPrisma.studentInfo.findUnique.mockResolvedValueOnce({
      id: 'student-1',
      accountBalance: 100000,
    });
    mockPrisma.studentInfo.update.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      parentEmail: 'parent@example.com',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      accountBalance: 250000,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      dropOutDate: null,
      customerCareServices: null,
      studentClasses: [],
      examSchedules: [],
    });

    await service.updateStudentAccountBalance({
      student_id: 'student-1',
      amount: 150000,
      reason: 'Phụ huynh chuyển khoản ngoài SePay',
    });

    const walletCreateMock = mockPrisma.walletTransactionsHistory
      .create as jest.MockedFunction<
      (args: { data: { note?: string | null } }) => unknown
    >;
    const walletCreateArg = walletCreateMock.mock.calls[0]?.[0];
    expect(walletCreateArg?.data.note).toContain(
      'Lý do: Phụ huynh chuyển khoản ngoài SePay',
    );
  });

  it('creates a SePay top-up order for accountant staff and stores creator metadata', async () => {
    sePayService.isWalletTopUpConfigured.mockReturnValue(true);
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.accountant],
    });
    mockPrisma.studentInfo.findUnique
      .mockResolvedValueOnce({
        id: 'student-1',
        fullName: 'Nguyen Van A',
        email: 'student@example.com',
        school: 'THPT Nguyen Du',
        province: 'Hanoi',
        birthYear: 2010,
        parentName: 'Parent A',
        parentPhone: '0900000000',
        parentEmail: 'parent@example.com',
        status: StudentStatus.inactive,
        gender: 'male',
        goal: 'Top 1',
        accountBalance: 250000,
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        updatedAt: new Date('2026-03-21T10:00:00.000Z'),
        dropOutDate: null,
        customerCareServices: null,
        studentClasses: [],
        examSchedules: [],
      })
      .mockResolvedValueOnce({
        id: 'student-1',
        parentEmail: 'parent@example.com',
      });
    sePayService.buildStudentWalletOrderCode.mockReturnValue('ABC123');
    sePayService.createStudentWalletTopUpPayment.mockResolvedValue({
      orderId: 'sepay-order-1',
      sepayStatus: 'Pending',
      vaNumber: '963NQDABC123',
      vaHolderName: 'UNICORNS EDU',
      bankName: 'BIDV',
      accountNumber: '1234567890',
      accountHolderName: 'UNICORNS EDU',
      expiredAt: null,
      qrCode: 'data:image/png;base64,abc',
      qrCodeUrl: 'https://qr.sepay.vn/img?template=compact',
      transferNote: 'Phụ huynh gia hạn tiền học phí ABC123',
    });
    mockPrisma.studentWalletSepayOrder.create.mockResolvedValue({
      id: 'order-row-1',
      studentId: 'student-1',
      orderCode: 'ABC123',
      status: 'pending',
      amountRequested: 500000,
      amountReceived: null,
      transferNote: 'Phụ huynh gia hạn tiền học phí ABC123',
      parentEmail: 'parent@example.com',
      sepayOrderId: 'sepay-order-1',
      sepayOrderStatus: 'Pending',
      sepayVaNumber: '963NQDABC123',
      sepayVaHolderName: 'UNICORNS EDU',
      sepayBankName: 'BIDV',
      sepayAccountNumber: '1234567890',
      sepayAccountHolderName: 'UNICORNS EDU',
      sepayQrCode: 'data:image/png;base64,abc',
      sepayQrCodeUrl: 'https://qr.sepay.vn/img?template=compact',
      sepayExpiredAt: null,
      createdByUserId: 'staff-user-1',
      createdByUserEmail: 'accountant@example.com',
      createdByRoleType: UserRole.staff,
      createdByStaffRoles: [StaffRole.accountant],
      createdAt: new Date('2026-05-11T09:15:00.000Z'),
      updatedAt: new Date('2026-05-11T09:15:00.000Z'),
    });

    await expect(
      service.createStudentSePayTopUpOrder(
        'student-1',
        { amount: 500000 },
        {
          userId: 'staff-user-1',
          userEmail: 'accountant@example.com',
          roleType: UserRole.staff,
        },
      ),
    ).resolves.toMatchObject({
      id: 'order-row-1',
      amount: 500000,
      orderCode: 'ABC123',
      qrCode: 'data:image/png;base64,abc',
    });

    const orderCreateMock = mockPrisma.studentWalletSepayOrder
      .create as jest.MockedFunction<
      (args: {
        data: {
          studentId: string;
          createdByUserId: string | null;
          createdByUserEmail: string | null;
          createdByRoleType: UserRole | null;
          createdByStaffRoles: StaffRole[];
        };
      }) => unknown
    >;
    const orderCreateArg = orderCreateMock.mock.calls[0]?.[0];
    expect(orderCreateArg?.data.studentId).toBe('student-1');
    expect(orderCreateArg?.data.createdByUserId).toBe('staff-user-1');
    expect(orderCreateArg?.data.createdByUserEmail).toBe(
      'accountant@example.com',
    );
    expect(orderCreateArg?.data.createdByRoleType).toBe(UserRole.staff);
    expect(orderCreateArg?.data.createdByStaffRoles).toEqual([
      StaffRole.accountant,
    ]);
  });

  it('blocks customer care staff from creating QR orders for unassigned students', async () => {
    sePayService.isWalletTopUpConfigured.mockReturnValue(true);
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.customer_care],
    });
    mockPrisma.customerCareService.findUnique.mockResolvedValue({
      staffId: 'staff-2',
    });

    await expect(
      service.createStudentSePayTopUpOrder(
        'student-1',
        { amount: 500000 },
        {
          userId: 'staff-user-1',
          userEmail: 'care@example.com',
          roleType: UserRole.staff,
        },
      ),
    ).rejects.toThrow('Student not found');

    expect(sePayService.buildStudentWalletOrderCode).not.toHaveBeenCalled();
    expect(mockPrisma.studentWalletSepayOrder.create).not.toHaveBeenCalled();
  });

  it('allows customer care staff to read the detail of their assigned student', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.customer_care],
    });
    mockPrisma.customerCareService.findUnique.mockResolvedValue({
      staffId: 'staff-1',
    });
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      parentEmail: 'parent@example.com',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      accountBalance: 250000,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      dropOutDate: null,
      customerCareServices: null,
      studentClasses: [],
    });

    await expect(
      service.getStudentById('student-1', {
        userId: 'user-1',
        roleType: UserRole.staff,
      }),
    ).resolves.toMatchObject({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      parentEmail: 'parent@example.com',
    });
  });

  it('allows accountant staff to read any student detail without customer care assignment', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.accountant],
    });
    mockPrisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
      school: 'THPT Nguyen Du',
      province: 'Hanoi',
      birthYear: 2010,
      parentName: 'Parent A',
      parentPhone: '0900000000',
      parentEmail: 'parent@example.com',
      status: StudentStatus.active,
      gender: 'male',
      goal: 'Top 1',
      accountBalance: 250000,
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-21T10:00:00.000Z'),
      dropOutDate: null,
      customerCareServices: null,
      studentClasses: [],
    });

    await expect(
      service.getStudentById('student-1', {
        userId: 'user-1',
        roleType: UserRole.staff,
      }),
    ).resolves.toMatchObject({
      id: 'student-1',
      fullName: 'Nguyen Van A',
      parentEmail: 'parent@example.com',
    });

    expect(mockPrisma.customerCareService.findUnique).not.toHaveBeenCalled();
  });

  it('rejects customer care staff when the student is not assigned to them', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.customer_care],
    });
    mockPrisma.customerCareService.findUnique.mockResolvedValue({
      staffId: 'staff-2',
    });

    await expect(
      service.getStudentById('student-1', {
        userId: 'user-1',
        roleType: UserRole.staff,
      }),
    ).rejects.toThrow('Student not found');

    expect(mockPrisma.studentInfo.findUnique).not.toHaveBeenCalled();
  });
});
