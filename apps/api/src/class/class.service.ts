import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassStatus, ClassType } from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateClassDto, UpdateClassDto } from 'src/dtos/class.dto';
import { Prisma } from '../../generated/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) { }

  async getClasses(
    query: PaginationQueryDto & {
      search?: string;
      status?: string;
      type?: string;
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
    const normalizedType = query.type?.trim();

    const statusFilter: ClassStatus | undefined =
      normalizedStatus === ClassStatus.running
        ? ClassStatus.running
        : normalizedStatus === ClassStatus.ended
          ? ClassStatus.ended
          : undefined;

    const typeFilter: ClassType | undefined =
      normalizedType === ClassType.vip
        ? ClassType.vip
        : normalizedType === ClassType.basic
          ? ClassType.basic
          : normalizedType === ClassType.advance
            ? ClassType.advance
            : normalizedType === ClassType.hardcore
              ? ClassType.hardcore
              : undefined;

    const where = {
      ...(trimmedSearch
        ? {
          name: {
            contains: trimmedSearch,
            mode: 'insensitive' as const,
          },
        }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    };

    const total = await this.prisma.class.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.class.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          type: 'desc',
        },
        {
          name: 'asc',
        },
      ],
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

  async getClassById(id: string) {
    const classInfo = await this.prisma.class.findUnique({
      where: { id },
    });

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    const classRecord = await this.prisma.classTeacher.findMany({
      where: { classId: id },
      include: {
        teacher: true,
      },
    });

    const teachers = classRecord.map((record) => record.teacher);

    return {
      ...classInfo,
      teachers,
    };
  }

  async createClass(data: CreateClassDto) {
    return await this.prisma.class.create({
      data: {
        id: data.id,
        name: data.name,
        type: data.type,
        status: data.status,
        maxStudents: data.max_students,
        allowancePerSessionPerStudent: data.allowance_per_session_per_student,
        maxAllowancePerSession: data.max_allowance_per_session,
        scaleAmount: data.scale_amount,
        schedule: data.schedule as Prisma.InputJsonValue | undefined,
        studentTuitionPerSession: data.student_tuition_per_session,
        tuitionPackageTotal: data.tuition_package_total,
        tuitionPackageSession: data.tuition_package_session,
      },
    });
  }

  async updateClass(data: UpdateClassDto) {
    const existingClass = await this.prisma.class.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    if (data.teacher_ids !== undefined) {
      await this.prisma.classTeacher.deleteMany({
        where: { classId: data.id },
      });
      await this.prisma.classTeacher.createMany({
        data: data.teacher_ids.map((teacherId) => ({
          classId: data.id,
          teacherId,
        })),
      });
    }

    const { teacher_ids: _teacherIds, ...updateData } = data;
    return await this.prisma.class.update({
      where: { id: data.id },
      data: {
        name: updateData.name,
        type: updateData.type,
        status: updateData.status,
        maxStudents: updateData.max_students,
        allowancePerSessionPerStudent: updateData.allowance_per_session_per_student,
        maxAllowancePerSession: updateData.max_allowance_per_session,
        scaleAmount: updateData.scale_amount,
        schedule: updateData.schedule as Prisma.InputJsonValue | undefined,
        studentTuitionPerSession: updateData.student_tuition_per_session,
        tuitionPackageTotal: updateData.tuition_package_total,
        tuitionPackageSession: updateData.tuition_package_session,
      },
    });
  }

  async deleteClass(id: string) {
    const existingClass = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingClass) {
      throw new NotFoundException('Class not found');
    }

    return await this.prisma.class.delete({
      where: { id },
    });
  }
}
