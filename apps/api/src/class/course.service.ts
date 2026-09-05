import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from 'src/dtos/class.dto';

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false) {
    return this.prisma.course.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        name: dto.name,
        sortOrder: dto.sort_order ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy khoá học.');
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.sort_order !== undefined ? { sortOrder: dto.sort_order } : {}),
        ...(dto.is_active !== undefined ? { isActive: dto.is_active } : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.course.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy khoá học.');
    }

    const classCount = await this.prisma.class.count({
      where: { courseId: id },
    });
    if (classCount > 0) {
      throw new BadRequestException(
        `Không thể xoá: còn ${classCount} lớp đang dùng khoá học này. Hãy chuyển lớp sang khoá khác hoặc chỉ ẩn (is_active=false) khoá học này.`,
      );
    }

    await this.prisma.course.delete({ where: { id } });
    return { success: true };
  }
}
