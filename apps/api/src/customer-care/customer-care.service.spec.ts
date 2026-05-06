jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { NotFoundException } from '@nestjs/common';
import { UserRole } from 'generated/enums';
import { CustomerCareService } from './customer-care.service';

describe('CustomerCareService', () => {
  const mockPrisma = {
    staffInfo: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  let service: CustomerCareService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    service = new CustomerCareService(mockPrisma as never);
  });

  it('returns commission aggregates from SQL rows with numeric totals', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue({ id: 'staff-1' });
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        studentId: 'student-1',
        fullName: 'Nguyen An',
        totalCommission: '12345',
      },
      {
        studentId: 'student-2',
        fullName: '',
        totalCommission: 67890n,
      },
    ]);

    const result = await service.getCommissionsByStaffId(
      'admin-user',
      UserRole.admin,
      'staff-1',
      7,
    );

    expect(mockPrisma.staffInfo.findUnique).toHaveBeenCalledWith({
      where: { id: 'staff-1' },
      select: { id: true },
    });
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockPrisma.attendance.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        studentId: 'student-1',
        fullName: 'Nguyen An',
        totalCommission: 12345,
      },
      {
        studentId: 'student-2',
        fullName: '',
        totalCommission: 67890,
      },
    ]);
  });

  it('does not aggregate commissions when the requested staff does not exist', async () => {
    mockPrisma.staffInfo.findUnique.mockResolvedValue(null);

    await expect(
      service.getCommissionsByStaffId(
        'admin-user',
        UserRole.admin,
        'missing-staff',
      ),
    ).rejects.toThrow(new NotFoundException('Staff not found'));

    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(mockPrisma.attendance.findMany).not.toHaveBeenCalled();
  });
});
