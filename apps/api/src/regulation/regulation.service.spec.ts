jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { RegulationAudience, StaffRole, UserRole } from 'generated/enums';
import { ActionHistoryService } from 'src/action-history/action-history.service';
import { RegulationService } from './regulation.service';

describe('RegulationService', () => {
  let service: RegulationService;
  const mockPrisma = {
    staffInfo: {
      findFirst: jest.fn(),
    },
    regulation: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const mockActionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    service = new RegulationService(
      mockPrisma as never,
      mockActionHistoryService as unknown as ActionHistoryService,
    );
  });

  it('returns all regulations for assistant staff', async () => {
    const row = makeRegulationRow({
      audiences: [RegulationAudience.staff_teacher],
    });
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      roles: [StaffRole.assistant],
    });
    mockPrisma.regulation.findMany.mockResolvedValue([row]);

    const result = await service.getRegulations({
      id: 'user-assistant',
      email: 'assistant@example.com',
      accountHandle: 'assistant',
      roleType: UserRole.staff,
    });

    expect(mockPrisma.regulation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(row.id);
  });

  it('filters regulations to matching staff audiences for normal staff', async () => {
    mockPrisma.staffInfo.findFirst.mockResolvedValue({
      roles: [StaffRole.teacher, StaffRole.customer_care],
    });
    mockPrisma.regulation.findMany.mockResolvedValue([]);

    await service.getRegulations({
      id: 'user-teacher',
      email: 'teacher@example.com',
      accountHandle: 'teacher',
      roleType: UserRole.staff,
    });

    expect(mockPrisma.regulation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { audiences: { has: RegulationAudience.all } },
            {
              audiences: {
                hasSome: [
                  RegulationAudience.staff_teacher,
                  RegulationAudience.staff_customer_care,
                ],
              },
            },
          ],
        },
      }),
    );
  });

  it('creates a regulation and records action history', async () => {
    const row = makeRegulationRow({
      title: 'Quy định mới',
      audiences: [RegulationAudience.all],
    });
    mockPrisma.regulation.create.mockResolvedValue(
      makeRegulationSnapshot({
        title: row.title,
        description: row.description,
        audiences: row.audiences,
        resourceLink: row.resourceLink,
        resourceLinkLabel: row.resourceLinkLabel,
      }),
    );
    mockPrisma.regulation.findUniqueOrThrow.mockResolvedValue(row);

    const result = await service.createRegulation(
      {
        id: 'admin-user',
        email: 'admin@example.com',
        accountHandle: 'admin',
        roleType: UserRole.admin,
      },
      {
        title: '  Quy định mới  ',
        description: '  Mô tả  ',
        content: '  <p>Nội dung</p>  ',
        audiences: [RegulationAudience.all, RegulationAudience.all],
        resourceLink: 'https://example.com/doc',
        resourceLinkLabel: 'Mở tài nguyên',
      },
      {
        userId: 'admin-user',
        userEmail: 'admin@example.com',
        roleType: UserRole.admin,
      },
    );

    const [[createArgs]] = mockPrisma.regulation.create.mock.calls as Array<
      [
        {
          data: {
            title: string;
            description: string | null;
            content: string;
            audiences: RegulationAudience[];
            createdByUserId: string;
            updatedByUserId: string;
          };
        },
      ]
    >;

    expect(createArgs).toBeDefined();
    expect(createArgs?.data).toMatchObject({
      title: 'Quy định mới',
      description: 'Mô tả',
      content: '<p>Nội dung</p>',
      audiences: [RegulationAudience.all],
      createdByUserId: 'admin-user',
      updatedByUserId: 'admin-user',
    });
    expect(mockActionHistoryService.recordCreate).toHaveBeenCalledTimes(1);
    expect(result.title).toBe('Quy định mới');
  });

  it('rejects a resource link label without a resource link', async () => {
    await expect(
      service.createRegulation(
        {
          id: 'admin-user',
          email: 'admin@example.com',
          accountHandle: 'admin',
          roleType: UserRole.admin,
        },
        {
          title: 'Quy định',
          description: null,
          content: '<p>Nội dung</p>',
          audiences: [RegulationAudience.all],
          resourceLink: null,
          resourceLinkLabel: 'Mở tài nguyên',
        },
      ),
    ).rejects.toThrow('Resource link label requires a resource link');
  });

  it('updates a regulation and records action history', async () => {
    const beforeValue = makeRegulationSnapshot({
      id: 'reg-1',
      title: 'Quy định cũ',
      description: 'Mô tả cũ',
      resourceLink: null,
      resourceLinkLabel: null,
    });
    const row = makeRegulationRow({
      id: 'reg-1',
      title: 'Quy định mới',
      description: 'Mô tả mới',
      audiences: [RegulationAudience.staff_teacher],
    });
    mockPrisma.regulation.findUnique.mockResolvedValue(beforeValue);
    mockPrisma.regulation.update.mockResolvedValue({
      ...beforeValue,
      title: row.title,
      description: row.description,
      audiences: row.audiences,
      resourceLink: row.resourceLink,
      resourceLinkLabel: row.resourceLinkLabel,
      updatedByUserId: 'assistant-user',
    });
    mockPrisma.regulation.findUniqueOrThrow.mockResolvedValue(row);

    const result = await service.updateRegulation(
      'reg-1',
      {
        id: 'assistant-user',
        email: 'assistant@example.com',
        accountHandle: 'assistant',
        roleType: UserRole.staff,
      },
      {
        title: '  Quy định mới  ',
        description: '  Mô tả mới  ',
        audiences: [RegulationAudience.staff_teacher],
        resourceLink: 'https://example.com/doc',
        resourceLinkLabel: 'Tài nguyên',
      },
      {
        userId: 'assistant-user',
        userEmail: 'assistant@example.com',
        roleType: UserRole.staff,
      },
    );

    const [[updateArgs]] = mockPrisma.regulation.update.mock.calls as Array<
      [
        {
          where: { id: string };
          data: {
            title: string;
            description: string | null;
            audiences: RegulationAudience[];
            resourceLink: string | null;
            resourceLinkLabel: string | null;
            updatedByUserId: string;
          };
        },
      ]
    >;

    expect(updateArgs).toBeDefined();
    expect(updateArgs?.where).toEqual({ id: 'reg-1' });
    expect(updateArgs?.data).toMatchObject({
      title: 'Quy định mới',
      description: 'Mô tả mới',
      audiences: [RegulationAudience.staff_teacher],
      resourceLink: 'https://example.com/doc',
      resourceLinkLabel: 'Tài nguyên',
      updatedByUserId: 'assistant-user',
    });
    expect(mockActionHistoryService.recordUpdate).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('reg-1');
  });
});

function makeRegulationRow(
  overrides: Partial<{
    id: string;
    title: string;
    description: string | null;
    content: string;
    audiences: RegulationAudience[];
    resourceLink: string | null;
    resourceLinkLabel: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? 'reg-1',
    title: overrides.title ?? 'Quy định mẫu',
    description: overrides.description ?? 'Mô tả mẫu',
    content: overrides.content ?? '<p>Nội dung mẫu</p>',
    audiences: overrides.audiences ?? [RegulationAudience.all],
    resourceLink: overrides.resourceLink ?? 'https://example.com/doc',
    resourceLinkLabel: overrides.resourceLinkLabel ?? 'Mở tài nguyên',
    createdAt: overrides.createdAt ?? new Date('2026-04-05T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-05T01:00:00.000Z'),
    createdBy: {
      id: 'user-1',
      accountHandle: 'creator',
      email: 'creator@example.com',
      first_name: 'Nguyen',
      last_name: 'A',
    },
    updatedBy: {
      id: 'user-2',
      accountHandle: 'editor',
      email: 'editor@example.com',
      first_name: 'Tran',
      last_name: 'B',
    },
  };
}

function makeRegulationSnapshot(
  overrides: Partial<{
    id: string;
    title: string;
    description: string | null;
    content: string;
    audiences: RegulationAudience[];
    resourceLink: string | null;
    resourceLinkLabel: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'reg-1',
    title: overrides.title ?? 'Quy định cũ',
    description: overrides.description ?? 'Mô tả cũ',
    content: overrides.content ?? '<p>Nội dung cũ</p>',
    audiences: overrides.audiences ?? [RegulationAudience.all],
    resourceLink: overrides.resourceLink ?? null,
    resourceLinkLabel: overrides.resourceLinkLabel ?? null,
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdAt: new Date('2026-04-05T00:00:00.000Z'),
    updatedAt: new Date('2026-04-05T00:30:00.000Z'),
  };
}
