import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { PaymentStatus } from '../../generated/enums';
import { CostService } from './cost.service';

describe('CostService', () => {
  const mockPrisma = {
    costExtend: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: CostService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CostService(mockPrisma as never);
  });

  it('returns paginated list with clamped limit and case-insensitive category search', async () => {
    mockPrisma.costExtend.count.mockResolvedValue(1);
    mockPrisma.costExtend.findMany.mockResolvedValue([
      {
        id: 'f6f002ba-8a5c-4d8d-9e54-6d7057d155f9',
        category: 'Marketing',
      },
    ]);

    const result = await service.getCosts({
      page: 2,
      limit: 999,
      search: ' mark ',
    });

    expect(mockPrisma.costExtend.count).toHaveBeenCalledWith({
      where: {
        category: {
          contains: 'mark',
          mode: 'insensitive',
        },
      },
    });
    expect(mockPrisma.costExtend.findMany).toHaveBeenCalledWith({
      where: {
        category: {
          contains: 'mark',
          mode: 'insensitive',
        },
      },
      skip: 0,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual({
      data: [
        {
          id: 'f6f002ba-8a5c-4d8d-9e54-6d7057d155f9',
          category: 'Marketing',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 100,
      },
    });
  });

  it('throws NotFoundException when get by id misses', async () => {
    mockPrisma.costExtend.findUnique.mockResolvedValue(null);

    await expect(
      service.getCostById('78aa4875-a5d4-496f-b45e-95fef8f6f881'),
    ).rejects.toThrow(new NotFoundException('Cost not found'));
  });

  it('throws NotFoundException when update misses', async () => {
    mockPrisma.costExtend.findUnique.mockResolvedValue(null);

    await expect(
      service.updateCost({
        id: 'f9b92551-8fe9-4f47-9259-c4f44f8ee4b0',
        status: PaymentStatus.paid,
      }),
    ).rejects.toThrow(new NotFoundException('Cost not found'));
  });

  it('throws NotFoundException when delete misses', async () => {
    mockPrisma.costExtend.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteCost('f2d57c88-f724-46df-9e4b-2f044f5dcf42'),
    ).rejects.toThrow(new NotFoundException('Cost not found'));
  });
});
