import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../dtos/pagination.dto';
import { CreateBonusDto, UpdateBonusDto } from '../dtos/bonus.dto';

@Injectable()
export class BonusService {
  constructor(private readonly prisma: PrismaService) {}

  async getBonuses(
    query: PaginationQueryDto & {
      staffId?: string;
      month?: string;
      status?: string;
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

    const where: any = {};

    if (query.staffId) {
      where.staffId = query.staffId;
    }

    if (query.month) {
      where.month = query.month;
    }

    if (query.status) {
      where.status = query.status;
    }

    const total = await this.prisma.bonus.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.bonus.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        staff: true,
      },
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

  async getBonusById(id: string) {
    const bonus = await this.prisma.bonus.findUnique({
      where: { id },
      include: { staff: true },
    });

    if (!bonus) {
      throw new NotFoundException('Bonus not found');
    }

    return bonus;
  }

  async createBonus(data: CreateBonusDto) {
    return await this.prisma.bonus.create({
      data: {
        id: data.id,
        staffId: data.staffId,
        workType: data.workType,
        month: data.month,
        amount: data.amount ?? 0,
        status: data.status,
        note: data.note,
      },
    });
  }

  async updateBonus(data: UpdateBonusDto) {
    const existingBonus = await this.prisma.bonus.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (!existingBonus) {
      throw new NotFoundException('Bonus not found');
    }

    const updateData: UpdateBonusDto = {};

    if (data.staffId !== undefined) updateData.staffId = data.staffId;
    if (data.workType !== undefined) updateData.workType = data.workType;
    if (data.month !== undefined) updateData.month = data.month;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.note !== undefined) updateData.note = data.note;

    return await this.prisma.bonus.update({
      where: { id: data.id },
      data: updateData,
    });
  }

  async deleteBonus(id: string) {
    const existingBonus = await this.prisma.bonus.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingBonus) {
      throw new NotFoundException('Bonus not found');
    }

    return await this.prisma.bonus.delete({
      where: { id },
    });
  }
}

