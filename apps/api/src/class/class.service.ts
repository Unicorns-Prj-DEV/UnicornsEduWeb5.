import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassStatus, ClassType, StaffRole, UserRole } from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  CreateClassDto,
  CreateStaffOpsClassDto,
  UpdateClassBasicInfoDto,
  UpdateClassDto,
  UpdateClassScheduleDto,
  UpdateClassStudentsDto,
  UpdateClassTeachersDto,
} from 'src/dtos/class.dto';
import { Prisma } from '../../generated/client';
import { PrismaService } from 'src/prisma/prisma.service';

function normalizeNullableMoney(
  value: number | null | undefined,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.floor(value);
}

function resolveDerivedTuitionPerSession(
  packageTotal: number | null | undefined,
  packageSession: number | null | undefined,
): number | null {
  if (
    typeof packageTotal !== 'number' ||
    !Number.isFinite(packageTotal) ||
    typeof packageSession !== 'number' ||
    !Number.isFinite(packageSession) ||
    packageSession <= 0
  ) {
    return null;
  }

  return Math.round(packageTotal / packageSession);
}

function resolveEffectiveTuitionPerSession(options: {
  customTuitionPerSession?: number | null;
  classTuitionPerSession?: number | null;
  effectivePackageTotal?: number | null;
  effectivePackageSession?: number | null;
}) {
  return (
    normalizeNullableMoney(options.customTuitionPerSession) ??
    normalizeNullableMoney(options.classTuitionPerSession) ??
    resolveDerivedTuitionPerSession(
      options.effectivePackageTotal,
      options.effectivePackageSession,
    )
  );
}

function hasCustomTuitionOverride(options: {
  customTuitionPerSession?: number | null;
  customTuitionPackageTotal?: number | null;
  customTuitionPackageSession?: number | null;
}) {
  return (
    normalizeNullableMoney(options.customTuitionPerSession) != null ||
    normalizeNullableMoney(options.customTuitionPackageTotal) != null ||
    normalizeNullableMoney(options.customTuitionPackageSession) != null
  );
}

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  private async getStaffOperationsActor(userId: string, roleType: UserRole) {
    if (roleType === UserRole.admin) {
      return {
        id: userId,
        roles: [] as StaffRole[],
      };
    }

    if (roleType !== UserRole.staff) {
      throw new ForbiddenException(
        'Chỉ tài khoản staff mới được dùng màn quản lý lớp học cho teacher.',
      );
    }

    const staff = await this.prisma.staffInfo.findFirst({
      where: { userId },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!staff) {
      throw new ForbiddenException(
        'Chỉ nhân sự có hồ sơ staff mới được dùng màn vận hành lớp học.',
      );
    }

    if (!staff.roles.includes(StaffRole.teacher)) {
      throw new ForbiddenException(
        'Màn /staff hiện chỉ mở cho staff có role teacher.',
      );
    }

    return staff;
  }

  async getClasses(
    query: PaginationQueryDto & {
      search?: string;
      status?: string;
      type?: string;
      teacherId?: string;
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
    const teacherId = query.teacherId?.trim();

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
      ...(teacherId
        ? {
            teachers: {
              some: {
                teacherId,
              },
            },
          }
        : {}),
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

    const studentCounts =
      classIds.length > 0
        ? await this.prisma.studentClass.groupBy({
            by: ['classId'],
            where: {
              classId: {
                in: classIds,
              },
            },
            _count: {
              _all: true,
            },
          })
        : [];

    const studentCountByClassId = studentCounts.reduce<Record<string, number>>(
      (acc, item) => ({
        ...acc,
        [item.classId]: item._count._all,
      }),
      {},
    );

    return {
      data: data.map((item) => ({
        ...item,
        studentCount: studentCountByClassId[item.id] ?? 0,
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
        student: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const students = classStudents.map((student) => {
      const customTuitionPerSession = normalizeNullableMoney(
        student.customStudentTuitionPerSession,
      );
      const customTuitionPackageTotal = normalizeNullableMoney(
        student.customTuitionPackageTotal,
      );
      const customTuitionPackageSession = normalizeNullableMoney(
        student.customTuitionPackageSession,
      );
      const effectiveTuitionPackageTotal =
        customTuitionPackageTotal ??
        normalizeNullableMoney(classInfo.tuitionPackageTotal);
      const effectiveTuitionPackageSession =
        customTuitionPackageSession ??
        normalizeNullableMoney(classInfo.tuitionPackageSession);
      const effectiveTuitionPerSession = resolveEffectiveTuitionPerSession({
        customTuitionPerSession,
        classTuitionPerSession: classInfo.studentTuitionPerSession,
        effectivePackageTotal: effectiveTuitionPackageTotal,
        effectivePackageSession: effectiveTuitionPackageSession,
      });

      return {
        ...student.student,
        customTuitionPerSession,
        customTuitionPackageTotal,
        customTuitionPackageSession,
        effectiveTuitionPerSession,
        effectiveTuitionPackageTotal,
        effectiveTuitionPackageSession,
        tuitionPackageSource: hasCustomTuitionOverride({
          customTuitionPerSession,
          customTuitionPackageTotal,
          customTuitionPackageSession,
        })
          ? 'custom'
          : effectiveTuitionPackageTotal != null ||
              effectiveTuitionPackageSession != null ||
              normalizeNullableMoney(classInfo.studentTuitionPerSession) != null
            ? 'class'
            : 'unset',
        totalAttendedSession: student.totalAttendedSession,
      };
    });

    return {
      ...classInfo,
      teachers,
      students,
      sessionTuitionTotal: students.reduce(
        (sum, student) => sum + (student.effectiveTuitionPerSession ?? 0),
        0,
      ),
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
      select: { id: true },
    });

    if (!classInfo) {
      throw new NotFoundException('Class not found');
    }

    const classStudents = await this.prisma.studentClass.findMany({
      where: { classId },
      include: {
        student: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return classStudents;
  }

  async getClassesForStaff(
    userId: string,
    roleType: UserRole,
    query: PaginationQueryDto & {
      search?: string;
      status?: string;
      type?: string;
    },
  ) {
    const actor = await this.getStaffOperationsActor(userId, roleType);
    return this.getClasses({
      ...query,
      ...(actor.roles.includes(StaffRole.teacher)
        ? { teacherId: actor.id }
        : {}),
    });
  }

  async getClassByIdForStaff(userId: string, roleType: UserRole, id: string) {
    const actor = await this.getStaffOperationsActor(userId, roleType);
    if (actor.roles.includes(StaffRole.teacher)) {
      const assignment = await this.prisma.classTeacher.findUnique({
        where: {
          classId_teacherId: {
            classId: id,
            teacherId: actor.id,
          },
        },
        select: { id: true },
      });

      if (!assignment) {
        throw new NotFoundException('Class not found');
      }
    }

    return this.getClassById(id);
  }

  async createClassForStaff(
    userId: string,
    roleType: UserRole,
    dto: CreateStaffOpsClassDto,
  ) {
    const actor = await this.getStaffOperationsActor(userId, roleType);
    if (actor.roles.includes(StaffRole.teacher)) {
      throw new ForbiddenException('Giáo viên không được phép tạo lớp học.');
    }

    return this.createClass({
      name: dto.name,
      type: dto.type,
      status: dto.status,
      schedule: dto.schedule,
    });
  }

  async updateClassScheduleForStaff(
    userId: string,
    roleType: UserRole,
    id: string,
    dto: UpdateClassScheduleDto,
  ) {
    const actor = await this.getStaffOperationsActor(userId, roleType);
    if (actor.roles.includes(StaffRole.teacher)) {
      const assignment = await this.prisma.classTeacher.findUnique({
        where: {
          classId_teacherId: {
            classId: id,
            teacherId: actor.id,
          },
        },
        select: { id: true },
      });

      if (!assignment) {
        throw new NotFoundException('Class not found');
      }
    }
    return this.updateClassSchedule(id, dto);
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

    const deduplicatedStudents = Array.from(
      new Map(dto.students.map((student) => [student.id, student])).values(),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.studentClass.deleteMany({
        where: { classId: id },
      });
      if (deduplicatedStudents.length > 0) {
        await tx.studentClass.createMany({
          data: deduplicatedStudents.map((student) => ({
            classId: id,
            studentId: student.id,
            customStudentTuitionPerSession:
              resolveDerivedTuitionPerSession(
                student.custom_tuition_package_total,
                student.custom_tuition_package_session,
              ) ?? student.custom_tuition_per_session,
            customTuitionPackageTotal: student.custom_tuition_package_total,
            customTuitionPackageSession: student.custom_tuition_package_session,
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
