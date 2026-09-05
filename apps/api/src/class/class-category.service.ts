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
    // ponytail: dual-write — create Course in same transaction as ClassCategory
    const sortOrder = dto.sort_order ?? 0;
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.classCategory.create({
        data: { name: dto.name, sortOrder },
      });
      await tx.course.create({
        data: { id: category.id, name: dto.name, sortOrder },
      });
      return category;
    });
  }

  async update(id: string, dto: UpdateClassCategoryDto) {
    const existing = await this.prisma.classCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy phân loại lớp.');
    }

    // ponytail: dual-write — update Course in same transaction
    const categoryData: Record<string, unknown> = {};
    const courseData: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      categoryData.name = dto.name;
      courseData.name = dto.name;
    }
    if (dto.sort_order !== undefined) {
      categoryData.sortOrder = dto.sort_order;
      courseData.sortOrder = dto.sort_order;
    }
    if (dto.is_active !== undefined) {
      categoryData.isActive = dto.is_active;
      courseData.isActive = dto.is_active;
    }

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.classCategory.update({
        where: { id },
        data: categoryData,
      });
      await tx.course.update({ where: { id }, data: courseData });
      return category;
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

    // ponytail: dual-write — delete Course in same transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.classCategory.delete({ where: { id } });
      await tx.course.delete({ where: { id } });
    });
    return { success: true };
  }
}
