import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateClassCategoryDto,
  UpdateClassCategoryDto,
} from 'src/dtos/class.dto';

@Injectable()
export class ClassCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false) {
    return this.prisma.classCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateClassCategoryDto) {
    return this.prisma.classCategory.create({
      data: {
        name: dto.name,
        sortOrder: dto.sort_order ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateClassCategoryDto) {
    const existing = await this.prisma.classCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phân loại lớp.');
    }

    return this.prisma.classCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.sort_order !== undefined ? { sortOrder: dto.sort_order } : {}),
        ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.classCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phân loại lớp.');
    }

    const classCount = await this.prisma.class.count({
      where: { classCategoryId: id },
    });
    if (classCount > 0) {
      throw new BadRequestException(
        `Không thể xoá: còn ${classCount} lớp đang dùng phân loại này. Hãy chuyển lớp sang phân loại khác hoặc chỉ ẩn (is_active=false) phân loại này.`,
      );
    }

    await this.prisma.classCategory.delete({ where: { id } });
    return { success: true };
  }
}
