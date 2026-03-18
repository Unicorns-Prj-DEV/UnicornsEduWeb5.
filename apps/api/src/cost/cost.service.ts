import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../dtos/pagination.dto';
import { CreateCostDto, UpdateCostDto } from '../dtos/cost.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CostService {
  constructor(private readonly prisma: PrismaService) { }

  async getCosts(
    query: PaginationQueryDto & {
      search?: string;
      year?: string;
      month?: string;
    },
  ) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;

    const trimmedSearch = query.search?.trim();
    const year = query.year?.trim();
    const month = query.month?.trim();
    const hasMonthFilter =
      year &&
      month &&
      /^\d{4}$/.test(year) &&
      /^(0?[1-9]|1[0-2])$/.test(month);
    const monthPrefix = hasMonthFilter
      ? `${year}-${month.length === 1 ? `0${month}` : month}`
      : null;

    const where = {
      ...(trimmedSearch
        ? {
          category: {
            contains: trimmedSearch,
            mode: 'insensitive' as const,
          },
        }
        : {}),
      ...(monthPrefix
        ? { date: { startsWith: monthPrefix } }
        : {}),
    };

    const total = await this.prisma.costExtend.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.costExtend.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

  async getCostById(id: string) {
    const cost = await this.prisma.costExtend.findUnique({
      where: { id },
    });

    if (!cost) {
      throw new NotFoundException('Cost not found');
    }

    return cost;
  }

  async createCost(data: CreateCostDto) {
    return await this.prisma.costExtend.create({
      data: {
        id: data.id,
        month: data.month,
        category: data.category,
        amount: data.amount,
        date: data.date,
        status: data.status,
      },
    });
  }

  async updateCost(data: UpdateCostDto) {
    const existingCost = await this.prisma.costExtend.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (!existingCost) {
      throw new NotFoundException('Cost not found');
    }

    let updateData: UpdateCostDto = {};
    if (data.month !== undefined) updateData.month = data.month;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.status !== undefined) updateData.status = data.status;


    return await this.prisma.costExtend.update({
      where: { id: data.id },
      data: updateData,
    });
  }

  async deleteCost(id: string) {
    const existingCost = await this.prisma.costExtend.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingCost) {
      throw new NotFoundException('Cost not found');
    }

    return await this.prisma.costExtend.delete({
      where: { id },
    });
  }
}