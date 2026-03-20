import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { ActionHistoryQueryDto } from '../dtos/action-history.dto';
import { PrismaService } from '../prisma/prisma.service';

const actionHistoryListSelect = {
  id: true,
  userId: true,
  userEmail: true,
  entityId: true,
  entityType: true,
  actionType: true,
  changedFields: true,
  createdAt: true,
  description: true,
} satisfies Prisma.ActionHistorySelect;

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

    const data = await this.prisma.actionHistory.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: actionHistoryListSelect,
    });

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
    });

    if (!actionHistory) {
      throw new NotFoundException('Action history not found');
    }

    return actionHistory;
  }
}
