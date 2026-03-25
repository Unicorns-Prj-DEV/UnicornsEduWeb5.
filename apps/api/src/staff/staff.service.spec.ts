jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('../../generated/client', () => ({
  Prisma: {
    sql: () => ({}),
    join: () => ({}),
  },
}));

import { PaymentStatus, StaffRole, UserRole } from '../../generated/enums';
import { StaffService } from './staff.service';

describe('StaffService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    staffInfo: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    classTeacher: {
      findMany: jest.fn(),
    },
    bonus: {
      findMany: jest.fn(),
    },
    extraAllowance: {
      groupBy: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: StaffService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.extraAllowance.groupBy.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    service = new StaffService(
      mockPrisma as never,
      actionHistoryService as never,
    );
  });

  it('records action history after creating a staff profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      roleType: UserRole.guest,
      staffInfo: null,
    });
    mockPrisma.staffInfo.create.mockResolvedValue({
      id: 'staff-1',
      fullName: 'Teacher A',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      university: 'HCMUS',
      highSchool: 'LHP',
      specialization: 'Math',
      bankAccount: '123',
      bankQrLink: 'qr',
      roles: [StaffRole.teacher],
      userId: 'user-1',
      status: 'active',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
    });
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      fullName: 'Teacher A',
      birthDate: new Date('2000-01-01T00:00:00.000Z'),
      university: 'HCMUS',
      highSchool: 'LHP',
      specialization: 'Math',
      bankAccount: '123',
      bankQrLink: 'qr',
      roles: [StaffRole.teacher],
      userId: 'user-1',
      status: 'active',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      user: {
        id: 'user-1',
        email: 'teacher@example.com',
        accountHandle: 'teacher',
        phone: null,
        first_name: 'Teacher',
        last_name: 'A',
        province: 'Hanoi',
        roleType: UserRole.staff,
        status: 'active',
        emailVerified: true,
        phoneVerified: false,
        linkId: null,
      },
      classTeachers: [],
    });

    await service.createStaff(
      {
        full_name: 'Teacher A',
        birth_date: '2000-01-01',
        university: 'HCMUS',
        high_school: 'LHP',
        specialization: 'Math',
        bank_account: '123',
        bank_qr_link: 'qr',
        roles: [StaffRole.teacher],
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
        entityType: 'staff',
        entityId: 'staff-1',
      }),
    );
  });

  it('aggregates customer care and lesson output allowances into other-role summaries', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.customer_care, StaffRole.lesson_plan],
      classTeachers: [],
    });
    mockPrisma.bonus.findMany
      .mockResolvedValueOnce([
        {
          workType: 'CSKH',
          amount: 5000,
          status: PaymentStatus.pending,
        },
        {
          workType: 'Giáo án',
          amount: 10000,
          status: PaymentStatus.paid,
        },
      ])
      .mockResolvedValueOnce([
        {
          amount: 5000,
        },
        {
          amount: 10000,
        },
      ]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ totalAllowance: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { paymentStatus: PaymentStatus.paid, totalAmount: 30000 },
        { paymentStatus: PaymentStatus.pending, totalAmount: 12000 },
      ])
      .mockResolvedValueOnce([
        { paymentStatus: PaymentStatus.paid, totalAmount: 30000 },
        { paymentStatus: PaymentStatus.pending, totalAmount: 12000 },
      ])
      .mockResolvedValueOnce([
        { paymentStatus: PaymentStatus.paid, totalAmount: 80000 },
        { paymentStatus: PaymentStatus.pending, totalAmount: 20000 },
      ])
      .mockResolvedValueOnce([
        { paymentStatus: PaymentStatus.paid, totalAmount: 80000 },
        { paymentStatus: PaymentStatus.pending, totalAmount: 20000 },
      ]);

    const result = await service.getIncomeSummary('staff-1', {
      month: '03',
      year: '2026',
      days: 14,
    });

    expect(result.monthlyIncomeTotals).toEqual({
      total: 157000,
      paid: 120000,
      unpaid: 37000,
    });
    expect(result.yearIncomeTotal).toBe(157000);
    expect(result.otherRoleSummaries).toEqual([
      {
        role: StaffRole.customer_care,
        label: 'CSKH',
        total: 47000,
        paid: 30000,
        unpaid: 17000,
      },
      {
        role: StaffRole.lesson_plan,
        label: 'Giáo án',
        total: 110000,
        paid: 90000,
        unpaid: 20000,
      },
    ]);
  });

  it('aggregates extra allowances for assistant and communication into other-role summaries', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.assistant, StaffRole.communication],
      classTeachers: [],
    });
    mockPrisma.bonus.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.extraAllowance.groupBy
      .mockResolvedValueOnce([
        {
          roleType: StaffRole.assistant,
          status: PaymentStatus.paid,
          _sum: { amount: 25000 },
        },
        {
          roleType: StaffRole.assistant,
          status: PaymentStatus.pending,
          _sum: { amount: 10000 },
        },
        {
          roleType: StaffRole.communication,
          status: PaymentStatus.pending,
          _sum: { amount: 15000 },
        },
      ])
      .mockResolvedValueOnce([
        {
          roleType: StaffRole.assistant,
          status: PaymentStatus.paid,
          _sum: { amount: 25000 },
        },
        {
          roleType: StaffRole.assistant,
          status: PaymentStatus.pending,
          _sum: { amount: 10000 },
        },
        {
          roleType: StaffRole.communication,
          status: PaymentStatus.pending,
          _sum: { amount: 15000 },
        },
        {
          roleType: StaffRole.communication,
          status: PaymentStatus.paid,
          _sum: { amount: 5000 },
        },
      ]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ totalAllowance: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getIncomeSummary('staff-1', {
      month: '03',
      year: '2026',
      days: 14,
    });

    expect(result.monthlyIncomeTotals).toEqual({
      total: 50000,
      paid: 25000,
      unpaid: 25000,
    });
    expect(result.yearIncomeTotal).toBe(55000);
    expect(result.otherRoleSummaries).toEqual([
      {
        role: StaffRole.assistant,
        label: 'Trợ lí',
        total: 35000,
        paid: 25000,
        unpaid: 10000,
      },
      {
        role: StaffRole.communication,
        label: 'Truyền thông',
        total: 15000,
        paid: 0,
        unpaid: 15000,
      },
    ]);
  });

  it('aggregates extra allowances for accountant into other-role summaries', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.accountant],
      classTeachers: [],
    });
    mockPrisma.bonus.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockPrisma.extraAllowance.groupBy
      .mockResolvedValueOnce([
        {
          roleType: StaffRole.accountant,
          status: PaymentStatus.paid,
          _sum: { amount: 7000 },
        },
        {
          roleType: StaffRole.accountant,
          status: PaymentStatus.pending,
          _sum: { amount: 3000 },
        },
      ])
      .mockResolvedValueOnce([
        {
          roleType: StaffRole.accountant,
          status: PaymentStatus.paid,
          _sum: { amount: 7000 },
        },
        {
          roleType: StaffRole.accountant,
          status: PaymentStatus.pending,
          _sum: { amount: 3000 },
        },
        {
          roleType: StaffRole.accountant,
          status: PaymentStatus.paid,
          _sum: { amount: 2000 },
        },
      ]);
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ totalAllowance: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.getIncomeSummary('staff-1', {
      month: '03',
      year: '2026',
      days: 14,
    });

    expect(result.monthlyIncomeTotals).toEqual({
      total: 10000,
      paid: 7000,
      unpaid: 3000,
    });
    expect(result.yearIncomeTotal).toBe(12000);
    expect(result.otherRoleSummaries).toEqual([
      {
        role: StaffRole.accountant,
        label: 'Kế toán',
        total: 10000,
        paid: 7000,
        unpaid: 3000,
      },
    ]);
  });

  it('returns authoritative unpaid totals for staff list rows', async () => {
    mockPrisma.staffInfo.count.mockResolvedValue(1);
    mockPrisma.staffInfo.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        fullName: 'Teacher A',
        status: 'active',
        roles: [StaffRole.teacher, StaffRole.customer_care],
        user: {
          province: 'Hanoi',
        },
        classTeachers: [],
      },
    ]);
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        staffId: 'staff-1',
        totalUnpaid: 345000,
      },
    ]);

    const result = await service.getStaff({
      page: 1,
      limit: 20,
    });

    expect(mockPrisma.staffInfo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          user: { select: { province: true } },
          classTeachers: {
            include: { class: { select: { id: true, name: true } } },
          },
        },
      }),
    );
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'staff-1',
        unpaidAmountTotal: 345000,
      }),
    ]);
  });
});
