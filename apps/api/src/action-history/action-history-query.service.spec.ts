import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { ActionHistoryQueryService } from './action-history-query.service';

describe('ActionHistoryQueryService', () => {
  const mockPrisma = {
    actionHistory: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: ActionHistoryQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionHistoryQueryService(mockPrisma as never);
  });

  it('returns paginated action history with exact-match filters and newest-first ordering', async () => {
    mockPrisma.actionHistory.count.mockResolvedValue(3);
    mockPrisma.actionHistory.findMany.mockResolvedValue([
      {
        id: 'history-1',
        entityType: 'session',
        actionType: 'update',
      },
    ]);

    const result = await service.getActionHistories({
      page: 5,
      limit: 20,
      entityType: ' session ',
      actionType: 'update',
      entityId: '97b2dbfc-f6bb-4b2f-bd36-46e820f6f4c8',
      userId: 'a6cc7079-4cf3-4dbb-b86e-b353d1388dac',
      startDate: '2026-03-01',
      endDate: '2026-03-20',
    });

    expect(mockPrisma.actionHistory.count).toHaveBeenCalledWith({
      where: {
        entityType: 'session',
        actionType: 'update',
        entityId: '97b2dbfc-f6bb-4b2f-bd36-46e820f6f4c8',
        userId: 'a6cc7079-4cf3-4dbb-b86e-b353d1388dac',
        createdAt: {
          gte: new Date('2026-03-01T00:00:00.000Z'),
          lt: new Date('2026-03-21T00:00:00.000Z'),
        },
      },
    });
    expect(mockPrisma.actionHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result).toEqual({
      data: [
        {
          id: 'history-1',
          entityType: 'session',
          actionType: 'update',
        },
      ],
      meta: {
        total: 3,
        page: 1,
        limit: 20,
      },
    });
  });

  it('throws NotFoundException when detail is missing', async () => {
    mockPrisma.actionHistory.findUnique.mockResolvedValue(null);

    await expect(
      service.getActionHistoryById('97b2dbfc-f6bb-4b2f-bd36-46e820f6f4c8'),
    ).rejects.toThrow(new NotFoundException('Action history not found'));
  });
});
