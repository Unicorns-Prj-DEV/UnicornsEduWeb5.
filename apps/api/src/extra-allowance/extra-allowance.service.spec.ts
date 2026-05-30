jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../payroll/deduction-rates', () => ({
  parseMonthKeyToEffectiveDate: jest.fn((monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(Date.UTC(year, (month ?? 1) - 1, 1));
  }),
  resolveTaxDeductionRate: jest.fn().mockResolvedValue(7.5),
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  PaymentStatus,
  StaffRole,
  StaffStatus,
  UserRole,
} from '../../generated/enums';
import { ExtraAllowanceService } from './extra-allowance.service';

describe('ExtraAllowanceService', () => {
  const mockPrisma = {
    staffInfo: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    extraAllowance: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: ExtraAllowanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      status: StaffStatus.active,
    });
    service = new ExtraAllowanceService(
      mockPrisma as never,
      actionHistoryService as never,
    );
  });

  it('creates admin extra allowances without requiring a client-provided id', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      status: StaffStatus.active,
    });
    mockPrisma.extraAllowance.create.mockResolvedValue({
      id: 'allowance-db-1',
      staffId: 'staff-1',
      amount: 200000,
      status: PaymentStatus.pending,
      note: 'Admin tạo trợ cấp',
      month: '2026-04',
      roleType: StaffRole.assistant,
      taxDeductionRatePercent: 7.5,
    });
    mockPrisma.extraAllowance.findUnique.mockResolvedValue({
      id: 'allowance-db-1',
      staffId: 'staff-1',
      amount: 200000,
      status: PaymentStatus.pending,
      note: 'Admin tạo trợ cấp',
      month: '2026-04',
      roleType: StaffRole.assistant,
      taxDeductionRatePercent: 7.5,
      staff: {
        id: 'staff-1',
        fullName: 'Assistant A',
        roles: [StaffRole.assistant],
        status: 'active',
      },
    });

    const result = await service.createExtraAllowance(
      {
        staffId: 'staff-1',
        month: '2026-04',
        amount: 200000,
        status: PaymentStatus.pending,
        note: 'Admin tạo trợ cấp',
        roleType: StaffRole.assistant,
      },
      {
        userId: 'admin-1',
        userEmail: 'admin@example.com',
        roleType: UserRole.admin,
      },
    );

    expect(mockPrisma.extraAllowance.create).toHaveBeenCalledWith({
      data: {
        staffId: 'staff-1',
        month: '2026-04',
        amount: 200000,
        status: PaymentStatus.pending,
        note: 'Admin tạo trợ cấp',
        roleType: StaffRole.assistant,
        taxDeductionRatePercent: 7.5,
      },
    });
    expect(result).toEqual({
      id: 'allowance-db-1',
      staffId: 'staff-1',
      amount: 200000,
      status: PaymentStatus.pending,
      note: 'Admin tạo trợ cấp',
      month: '2026-04',
      roleType: StaffRole.assistant,
      taxDeductionRatePercent: 7.5,
    });
  });

  it('rejects creating an extra allowance for inactive staff', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({
      id: 'staff-1',
      status: StaffStatus.inactive,
    });

    await expect(
      service.createExtraAllowance({
        staffId: 'staff-1',
        month: '2026-04',
        amount: 200000,
        status: PaymentStatus.pending,
        roleType: StaffRole.assistant,
      }),
    ).rejects.toThrow('Nhân sự đang ở trạng thái ngừng hoạt động.');

    expect(mockPrisma.extraAllowance.create).not.toHaveBeenCalled();
  });

  it('allows technical staff to create their own pending extra allowance with role-aware tax snapshot', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.technical],
    });
    mockPrisma.extraAllowance.create.mockResolvedValue({
      id: 'allowance-1',
      staffId: 'staff-1',
      amount: 175000,
      status: PaymentStatus.pending,
      note: 'Hỗ trợ kỹ thuật tháng 4',
      month: '2026-04',
      roleType: StaffRole.technical,
      taxDeductionRatePercent: 7.5,
    });
    mockPrisma.extraAllowance.findUnique.mockResolvedValue({
      id: 'allowance-1',
      staffId: 'staff-1',
      amount: 175000,
      status: PaymentStatus.pending,
      note: 'Hỗ trợ kỹ thuật tháng 4',
      month: '2026-04',
      roleType: StaffRole.technical,
      taxDeductionRatePercent: 7.5,
      staff: {
        id: 'staff-1',
        fullName: 'Technical A',
        roles: [StaffRole.technical],
        status: 'active',
      },
    });

    const result = await service.createMyStaffExtraAllowance(
      {
        id: 'user-1',
        email: 'technical@example.com',
        roleType: UserRole.staff,
      },
      {
        roleType: StaffRole.technical,
        month: '2026-04',
        amount: 175000,
        note: 'Hỗ trợ kỹ thuật tháng 4',
      },
    );

    expect(mockPrisma.extraAllowance.create).toHaveBeenCalledWith({
      data: {
        staffId: 'staff-1',
        month: '2026-04',
        amount: 175000,
        status: PaymentStatus.pending,
        note: 'Hỗ trợ kỹ thuật tháng 4',
        roleType: StaffRole.technical,
        taxDeductionRatePercent: 7.5,
      },
    });
    expect(actionHistoryService.recordCreate).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'allowance-1',
      staffId: 'staff-1',
      amount: 175000,
      status: PaymentStatus.pending,
      note: 'Hỗ trợ kỹ thuật tháng 4',
      month: '2026-04',
      roleType: StaffRole.technical,
      taxDeductionRatePercent: 7.5,
    });
  });

  it('allows training staff to create their own pending extra allowance', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-training-1',
      roles: [StaffRole.training],
    });
    mockPrisma.extraAllowance.create.mockResolvedValue({
      id: 'allowance-training-1',
      staffId: 'staff-training-1',
      amount: 220000,
      status: PaymentStatus.pending,
      note: 'Hỗ trợ đào tạo tháng 5',
      month: '2026-05',
      roleType: StaffRole.training,
      taxDeductionRatePercent: 7.5,
    });
    mockPrisma.extraAllowance.findUnique.mockResolvedValue({
      id: 'allowance-training-1',
      staffId: 'staff-training-1',
      amount: 220000,
      status: PaymentStatus.pending,
      note: 'Hỗ trợ đào tạo tháng 5',
      month: '2026-05',
      roleType: StaffRole.training,
      taxDeductionRatePercent: 7.5,
      staff: {
        id: 'staff-training-1',
        fullName: 'Training A',
        roles: [StaffRole.training],
        status: 'active',
      },
    });

    const result = await service.createMyStaffExtraAllowance(
      {
        id: 'training-user-1',
        email: 'training@example.com',
        roleType: UserRole.staff,
      },
      {
        roleType: StaffRole.training,
        month: '2026-05',
        amount: 220000,
        note: 'Hỗ trợ đào tạo tháng 5',
      },
    );

    expect(mockPrisma.extraAllowance.create).toHaveBeenCalledWith({
      data: {
        staffId: 'staff-training-1',
        month: '2026-05',
        amount: 220000,
        status: PaymentStatus.pending,
        note: 'Hỗ trợ đào tạo tháng 5',
        roleType: StaffRole.training,
        taxDeductionRatePercent: 7.5,
      },
    });
    expect(actionHistoryService.recordCreate).toHaveBeenCalled();
    expect(result).toEqual({
      id: 'allowance-training-1',
      staffId: 'staff-training-1',
      amount: 220000,
      status: PaymentStatus.pending,
      note: 'Hỗ trợ đào tạo tháng 5',
      month: '2026-05',
      roleType: StaffRole.training,
      taxDeductionRatePercent: 7.5,
    });
  });

  it('allows communication staff to update their own extra allowance without changing payment status', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.communication],
    });
    mockPrisma.extraAllowance.findUnique
      .mockResolvedValueOnce({
        id: 'allowance-1',
        staffId: 'staff-1',
        amount: 150000,
        status: PaymentStatus.paid,
        note: 'Ghi chú cũ',
        month: '2026-03',
        roleType: StaffRole.communication,
        staff: {
          id: 'staff-1',
          fullName: 'Communication A',
          roles: [StaffRole.communication],
          status: 'active',
        },
      })
      .mockResolvedValueOnce({
        id: 'allowance-1',
        staffId: 'staff-1',
        amount: 250000,
        status: PaymentStatus.paid,
        note: 'Ghi chú mới',
        month: '2026-04',
        roleType: StaffRole.communication,
        staff: {
          id: 'staff-1',
          fullName: 'Communication A',
          roles: [StaffRole.communication],
          status: 'active',
        },
      });
    mockPrisma.extraAllowance.update.mockResolvedValue({
      id: 'allowance-1',
      staffId: 'staff-1',
      amount: 250000,
      status: PaymentStatus.paid,
      note: 'Ghi chú mới',
      month: '2026-04',
      roleType: StaffRole.communication,
    });

    const result = await service.updateMyStaffExtraAllowance(
      {
        id: 'user-1',
        email: 'communication@example.com',
        roleType: UserRole.staff,
      },
      {
        id: 'allowance-1',
        roleType: StaffRole.communication,
        month: '2026-04',
        amount: 250000,
        note: 'Ghi chú mới',
      },
    );

    expect(mockPrisma.extraAllowance.update).toHaveBeenCalledWith({
      where: { id: 'allowance-1' },
      data: {
        month: '2026-04',
        amount: 250000,
        note: 'Ghi chú mới',
        taxDeductionRatePercent: 7.5,
      },
    });
    expect(actionHistoryService.recordUpdate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'extra_allowance',
        entityId: 'allowance-1',
      }),
    );
    expect(result).toEqual({
      id: 'allowance-1',
      staffId: 'staff-1',
      amount: 250000,
      status: PaymentStatus.paid,
      note: 'Ghi chú mới',
      month: '2026-04',
      roleType: StaffRole.communication,
    });
  });

  it('allows training staff to update their own extra allowance without changing payment status', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-training-1',
      roles: [StaffRole.training],
    });
    mockPrisma.extraAllowance.findUnique
      .mockResolvedValueOnce({
        id: 'allowance-training-1',
        staffId: 'staff-training-1',
        amount: 180000,
        status: PaymentStatus.pending,
        note: 'Ghi chú cũ',
        month: '2026-05',
        roleType: StaffRole.training,
        staff: {
          id: 'staff-training-1',
          fullName: 'Training A',
          roles: [StaffRole.training],
          status: 'active',
        },
      })
      .mockResolvedValueOnce({
        id: 'allowance-training-1',
        staffId: 'staff-training-1',
        amount: 260000,
        status: PaymentStatus.pending,
        note: 'Ghi chú đào tạo mới',
        month: '2026-06',
        roleType: StaffRole.training,
        staff: {
          id: 'staff-training-1',
          fullName: 'Training A',
          roles: [StaffRole.training],
          status: 'active',
        },
      });
    mockPrisma.extraAllowance.update.mockResolvedValue({
      id: 'allowance-training-1',
      staffId: 'staff-training-1',
      amount: 260000,
      status: PaymentStatus.pending,
      note: 'Ghi chú đào tạo mới',
      month: '2026-06',
      roleType: StaffRole.training,
    });

    const result = await service.updateMyStaffExtraAllowance(
      {
        id: 'training-user-1',
        email: 'training@example.com',
        roleType: UserRole.staff,
      },
      {
        id: 'allowance-training-1',
        roleType: StaffRole.training,
        month: '2026-06',
        amount: 260000,
        note: 'Ghi chú đào tạo mới',
      },
    );

    expect(mockPrisma.extraAllowance.update).toHaveBeenCalledWith({
      where: { id: 'allowance-training-1' },
      data: {
        month: '2026-06',
        amount: 260000,
        note: 'Ghi chú đào tạo mới',
        taxDeductionRatePercent: 7.5,
      },
    });
    expect(actionHistoryService.recordUpdate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'extra_allowance',
        entityId: 'allowance-training-1',
      }),
    );
    expect(result).toEqual({
      id: 'allowance-training-1',
      staffId: 'staff-training-1',
      amount: 260000,
      status: PaymentStatus.pending,
      note: 'Ghi chú đào tạo mới',
      month: '2026-06',
      roleType: StaffRole.training,
    });
  });

  it('rejects self updates when current staff lacks communication role', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.assistant],
    });

    await expect(
      service.updateMyStaffExtraAllowance(
        {
          id: 'user-1',
          email: 'assistant@example.com',
          roleType: UserRole.staff,
        },
        {
          id: 'allowance-1',
          roleType: StaffRole.communication,
          month: '2026-04',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects self create when current staff lacks requested technical role', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.communication],
    });

    await expect(
      service.createMyStaffExtraAllowance(
        {
          id: 'user-1',
          email: 'communication@example.com',
          roleType: UserRole.staff,
        },
        {
          roleType: StaffRole.technical,
          month: '2026-04',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects self updates for communication allowances owned by another staff', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      id: 'staff-1',
      roles: [StaffRole.communication],
    });
    mockPrisma.extraAllowance.findUnique.mockResolvedValue({
      id: 'allowance-1',
      staffId: 'staff-2',
      amount: 150000,
      status: PaymentStatus.pending,
      note: 'Khác staff',
      month: '2026-03',
      roleType: StaffRole.communication,
      staff: {
        id: 'staff-2',
        fullName: 'Communication B',
        roles: [StaffRole.communication],
        status: 'active',
      },
    });

    await expect(
      service.updateMyStaffExtraAllowance(
        {
          id: 'user-1',
          email: 'communication@example.com',
          roleType: UserRole.staff,
        },
        {
          id: 'allowance-1',
          roleType: StaffRole.communication,
          amount: 250000,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects admin updates when id is missing', async () => {
    await expect(
      service.updateExtraAllowance({
        month: '2026-04',
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
