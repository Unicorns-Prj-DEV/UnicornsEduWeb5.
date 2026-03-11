import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateStaffDto, UpdateStaffDto } from 'src/dtos/staff.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async getStaff(query: PaginationQueryDto) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;
    const skip = (page - 1) * limit;

    return await this.prisma.staffInfo.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
