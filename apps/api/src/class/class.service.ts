import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassStatus, ClassType } from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  CreateClassDto,
  UpdateClassBasicInfoDto,
  UpdateClassDto,
  UpdateClassScheduleDto,
  UpdateClassStudentsDto,
  UpdateClassTeachersDto,
} from 'src/dtos/class.dto';
import { Prisma } from '../../generated/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

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

    const classIds = data.map((item) => item.id);
    const classTeachers =
      classIds.length > 0
        ? await this.prisma.classTeacher.findMany({
            where: {
              classId: {
                in: classIds,
              },
            },
            select: {
              classId: true,
              customAllowance: true,
              teacher: {
                select: {
                  id: true,
                  fullName: true,
                  status: true,
                },
              },
            },
          })
        : [];

    const teachersByClassId = classTeachers.reduce<
      Record<string, typeof classTeachers>
    >((acc, item) => {
      const current = acc[item.classId] ?? [];
      return {
        ...acc,
        [item.classId]: [...current, item],
      };
    }, {});

    return {
      data: data.map((item) => ({
        ...item,
        teachers: (teachersByClassId[item.id] ?? []).map((record) => ({
          ...record.teacher,
          customAllowance: record.customAllowance,
        })),
      })),
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
      select: {
        customAllowance: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
            status: true,
          },
        },
      },
    });

    const teachers = classRecord.map((record) => ({
      ...record.teacher,
      customAllowance: record.customAllowance,
    }));

    const classStudents = await this.prisma.studentClass.findMany({
      where: { classId: id },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const studentsById = classStudents.reduce<
      Record<
        string,
        {
          id: string;
          fullName: string;
          status: string;
          remainingSessions: number | null;
        }
      >
    >((acc, item) => {
      if (acc[item.student.id]) {
        return acc;
      }

      const packageSessionCount =
        item.customTuitionPackageSession ?? classInfo.tuitionPackageSession;
      const attendedSessionCount = item.totalAttendedSession ?? 0;
      const remainingSessions =
        packageSessionCount != null
          ? Math.max(packageSessionCount - attendedSessionCount, 0)
          : null;

      return {
        ...acc,
        [item.student.id]: {
          id: item.student.id,
          fullName: item.student.fullName,
          status: item.student.status,
          remainingSessions,
        },
      };
    }, {});

    return {
      ...classInfo,
      teachers,
      students: Object.values(studentsById),
    };
  }

  private getTeacherPayload(data: {
    teachers?: { teacher_id: string; custom_allowance?: number }[];
    teacher_ids?: string[];
  }): { teacherId: string; customAllowance: number | null }[] {
    if (data.teachers && data.teachers.length > 0) {
      return data.teachers.map((t) => ({
        teacherId: t.teacher_id,
        customAllowance: t.custom_allowance ?? null,
      }));
    }
    if (data.teacher_ids && data.teacher_ids.length > 0) {
      return data.teacher_ids.map((teacherId) => ({
        teacherId,
        customAllowance: null,
      }));
    }
    return [];
  }

  async getStudentsByClassId(classId: string) {
    const classInfo = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, tuitionPackageSession: true },
    });

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    const classStudents = await this.prisma.studentClass.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const studentsById = classStudents.reduce<
      Record<
        string,
        {
          id: string;
          fullName: string;
          status: string;
          remainingSessions: number | null;
        }
      >
    >((acc, item) => {
      if (acc[item.student.id]) {
        return acc;
      }

      const packageSessionCount =
        item.customTuitionPackageSession ?? classInfo.tuitionPackageSession;
      const attendedSessionCount = item.totalAttendedSession ?? 0;
      const remainingSessions =
        packageSessionCount != null
          ? Math.max(packageSessionCount - attendedSessionCount, 0)
          : null;

      return {
        ...acc,
        [item.student.id]: {
          id: item.student.id,
          fullName: item.student.fullName,
          status: item.student.status,
          remainingSessions,
        },
      };
    }, {});

    return Object.values(studentsById);
  }

  async createClass(data: CreateClassDto) {
    return await this.prisma.$transaction(async (tx) => {
      const createdClass = await tx.class.create({
        data: {
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

      const teacherPayload = this.getTeacherPayload(data);
      if (teacherPayload.length > 0) {
        await tx.classTeacher.createMany({
          data: teacherPayload.map((t) => ({
            classId: createdClass.id,
            teacherId: t.teacherId,
            customAllowance: t.customAllowance,
          })),
        });
      }

      if (data.student_ids && data.student_ids.length > 0) {
        await tx.studentClass.createMany({
          data: data.student_ids.map((studentId) => ({
            classId: createdClass.id,
            studentId,
          })),
        });
      }

      const classRecord = await tx.classTeacher.findMany({
        where: { classId: createdClass.id },
        select: {
          customAllowance: true,
          teacher: {
            select: {
              id: true,
              fullName: true,
              status: true,
            },
          },
        },
      });

      return {
        ...createdClass,
        teachers: classRecord.map((record) => ({
          ...record.teacher,
          customAllowance: record.customAllowance,
        })),
      };
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

    const {
      teacher_ids: _teacherIds,
      teachers: _teachers,
      student_ids: _studentIds,
      ...updateData
    } = data;

    return await this.prisma.$transaction(async (tx) => {
      const teacherPayload =
        data.teachers !== undefined || data.teacher_ids !== undefined
          ? this.getTeacherPayload(data)
          : null;

      if (teacherPayload !== null) {
        await tx.classTeacher.deleteMany({
          where: { classId: data.id },
        });

        if (teacherPayload.length > 0) {
          await tx.classTeacher.createMany({
            data: teacherPayload.map((t) => ({
              classId: data.id,
              teacherId: t.teacherId,
              customAllowance: t.customAllowance,
            })),
          });
        }
      }

      if (data.student_ids !== undefined) {
        await tx.studentClass.deleteMany({
          where: { classId: data.id },
        });

        if (data.student_ids.length > 0) {
          await tx.studentClass.createMany({
            data: data.student_ids.map((studentId) => ({
              classId: data.id,
              studentId,
            })),
          });
        }
      }

      const updatedClass = await tx.class.update({
        where: { id: data.id },
        data: {
          name: updateData.name,
          type: updateData.type,
          status: updateData.status,
          maxStudents: updateData.max_students,
          allowancePerSessionPerStudent:
            updateData.allowance_per_session_per_student,
          maxAllowancePerSession: updateData.max_allowance_per_session,
          scaleAmount: updateData.scale_amount,
          schedule: updateData.schedule as Prisma.InputJsonValue | undefined,
          studentTuitionPerSession: updateData.student_tuition_per_session,
          tuitionPackageTotal: updateData.tuition_package_total,
          tuitionPackageSession: updateData.tuition_package_session,
        },
      });

      const classRecord = await tx.classTeacher.findMany({
        where: { classId: data.id },
        select: {
          customAllowance: true,
          teacher: {
            select: {
              id: true,
              fullName: true,
              status: true,
            },
          },
        },
      });

      return {
        ...updatedClass,
        teachers: classRecord.map((record) => ({
          ...record.teacher,
          customAllowance: record.customAllowance,
        })),
      };
    });
  }

  async updateClassBasicInfo(id: string, dto: UpdateClassBasicInfoDto) {
    const existing = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Class not found');
    }

    const data: Prisma.ClassUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.max_students !== undefined) data.maxStudents = dto.max_students;
    if (dto.allowance_per_session_per_student !== undefined) {
      data.allowancePerSessionPerStudent =
        dto.allowance_per_session_per_student;
    }
    if (dto.max_allowance_per_session !== undefined) {
      data.maxAllowancePerSession = dto.max_allowance_per_session;
    }
    if (dto.scale_amount !== undefined) data.scaleAmount = dto.scale_amount;
    if (dto.student_tuition_per_session !== undefined) {
      data.studentTuitionPerSession = dto.student_tuition_per_session;
    }
    if (dto.tuition_package_total !== undefined) {
      data.tuitionPackageTotal = dto.tuition_package_total;
    }
    if (dto.tuition_package_session !== undefined) {
      data.tuitionPackageSession = dto.tuition_package_session;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.class.update({
        where: { id },
        data,
      });
      if (dto.allowance_per_session_per_student !== undefined) {
        await tx.classTeacher.updateMany({
          where: { classId: id },
          data: {
            customAllowance: dto.allowance_per_session_per_student,
          },
        });
      }
    });

    return this.getClassById(id);
  }

  async updateClassTeachers(id: string, dto: UpdateClassTeachersDto) {
    const existing = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Class not found');
    }

    const teacherPayload = this.getTeacherPayload({ teachers: dto.teachers });

    await this.prisma.$transaction(async (tx) => {
      await tx.classTeacher.deleteMany({
        where: { classId: id },
      });
      if (teacherPayload.length > 0) {
        await tx.classTeacher.createMany({
          data: teacherPayload.map((t) => ({
            classId: id,
            teacherId: t.teacherId,
            customAllowance: t.customAllowance,
          })),
        });
      }
    });

    return this.getClassById(id);
  }

  async updateClassSchedule(id: string, dto: UpdateClassScheduleDto) {
    const existing = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Class not found');
    }

    const schedule = dto.schedule as unknown as Prisma.InputJsonValue;
    await this.prisma.class.update({
      where: { id },
      data: { schedule },
    });

    return this.getClassById(id);
  }

  async updateClassStudents(id: string, dto: UpdateClassStudentsDto) {
    const existing = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Class not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.studentClass.deleteMany({
        where: { classId: id },
      });
      if (dto.student_ids.length > 0) {
        await tx.studentClass.createMany({
          data: dto.student_ids.map((studentId) => ({
            classId: id,
            studentId,
          })),
        });
      }
    });

    return this.getClassById(id);
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
