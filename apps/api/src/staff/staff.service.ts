import { Injectable, NotFoundException } from '@nestjs/common';
import { StaffStatus } from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateStaffDto, UpdateStaffDto } from 'src/dtos/staff.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async getStaff(
    query: PaginationQueryDto & {
      search?: string;
      status?: string;
      classId?: string;
      province?: string;
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
    const normalizedStatus = query.status?.trim();
    const trimmedClassId = query.classId?.trim();
    const trimmedProvince = query.province?.trim();
    const statusFilter: StaffStatus | undefined =
      normalizedStatus === 'active'
        ? StaffStatus.active
        : normalizedStatus === 'inactive'
          ? StaffStatus.inactive
          : undefined;

    const where = {
      ...(trimmedSearch
        ? {
            fullName: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(trimmedClassId
        ? {
            classTeachers: {
              some: {
                classId: trimmedClassId,
              },
            },
          }
        : {}),
      ...(trimmedProvince
        ? {
            user: {
              province: {
                contains: trimmedProvince,
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
    };

    const total = await this.prisma.staffInfo.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.staffInfo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { province: true } },
        classTeachers: {
          include: { class: { select: { id: true, name: true } } },
        },
        monthlyStats: {
          orderBy: { month: 'desc' },
          take: 1,
          select: { totalUnpaidAll: true },
        },
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

  async getStaffById(id: string) {
    return await this.prisma.staffInfo.findUnique({
      where: {
        id,
      },
    });
  }

  async updateStaff(data: UpdateStaffDto) {
    return await this.prisma.staffInfo.update({
      where: {
        id: data.id,
      },
      data: {
        ...data,
      },
    });
  }

  async deleteStaff(id: string) {
    return await this.prisma.staffInfo.delete({
      where: {
        id,
      },
    });
  }
  async createStaff(data: CreateStaffDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.user_id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return await this.prisma.staffInfo.create({
      data: {
        fullName: data.full_name,
        birthDate: data.birth_date,
        university: data.university,
        highSchool: data.high_school,
        specialization: data.specialization,
        bankAccount: data.bank_account,
        bankQrLink: data.bank_qr_link,
        roles: data.roles,
        userId: data.user_id,
      },
    });
  }
}
