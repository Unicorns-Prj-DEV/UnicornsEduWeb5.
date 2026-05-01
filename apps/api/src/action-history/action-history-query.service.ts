import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { ActionHistoryQueryDto } from '../dtos/action-history.dto';
import { PrismaService } from '../prisma/prisma.service';

const actionHistoryListSelect = {
  id: true,
  userId: true,
  userEmail: true,
  user: {
    select: {
      first_name: true,
      last_name: true,
      email: true,
    },
  },
  entityId: true,
  entityType: true,
  actionType: true,
  beforeValue: true,
  afterValue: true,
  changedFields: true,
  createdAt: true,
  description: true,
} satisfies Prisma.ActionHistorySelect;

function computeUserFullName(
  user?: { first_name?: string | null; last_name?: string | null } | null,
) {
  const first = user?.first_name?.trim() ?? '';
  const last = user?.last_name?.trim() ?? '';
  return `${last} ${first}`.trim() || null;
}

function extractEntityDisplayName(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidateKeys = [
    'fullName',
    'name',
    'email',
    'accountHandle',
    'title',
    'category',
    'workType',
  ];

  for (const key of candidateKeys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function parseDateStart(value?: string) {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function parseDateEnd(value?: string) {
  if (!value) {
    return undefined;
  }

  const end = new Date(`${value}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

@Injectable()
export class ActionHistoryQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: ActionHistoryQueryDto) {
    const startDate = parseDateStart(query.startDate);
    const endDate = parseDateEnd(query.endDate);

    return {
      ...(query.entityType?.trim()
        ? { entityType: query.entityType.trim() }
        : {}),
      ...(query.actionType ? { actionType: query.actionType } : {}),
      ...(query.entityId?.trim() ? { entityId: query.entityId.trim() } : {}),
      ...(query.userId?.trim() ? { userId: query.userId.trim() } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lt: endDate } : {}),
            },
          }
        : {}),
    } satisfies Prisma.ActionHistoryWhereInput;
  }

  async getActionHistories(query: ActionHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const total = await this.prisma.actionHistory.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const rows = await this.prisma.actionHistory.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: actionHistoryListSelect,
    });
    const data = rows.map(({ beforeValue, afterValue, user, ...item }) => ({
      ...item,
      userEmail: item.userEmail?.trim() || user?.email?.trim() || null,
      userFullName: computeUserFullName(user),
      entityDisplayName:
        extractEntityDisplayName(afterValue) ??
        extractEntityDisplayName(beforeValue),
    }));

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit,
      },
    };
  }

  async getActionHistoryById(id: string) {
    const actionHistory = await this.prisma.actionHistory.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!actionHistory) {
      throw new NotFoundException('Action history not found');
    }

    const { user, ...rest } = actionHistory;
    return {
      ...rest,
      userEmail: rest.userEmail?.trim() || user?.email?.trim() || null,
      userFullName: computeUserFullName(user),
    };
  }
}
