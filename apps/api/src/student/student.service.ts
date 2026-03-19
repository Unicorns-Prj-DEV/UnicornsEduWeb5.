import { Injectable, NotFoundException } from '@nestjs/common';
import { Gender, StudentStatus } from 'generated/enums';
import { Prisma } from '../../generated/client';
import {
  CreateStudentDto,
  StudentListQueryDto,
  UpdateStudentAccountBalanceCreateDto,
  UpdateStudentBodyDto,
  UpdateStudentClassesDto,
  UpdateStudentDto,
} from 'src/dtos/student.dto';
import { PrismaService } from 'src/prisma/prisma.service';

const studentClassDetailInclude = {
  include: {
    class: {
      select: {
        id: true,
        name: true,
        tuitionPackageTotal: true,
        tuitionPackageSession: true,
        studentTuitionPerSession: true,
      },
    },
  },
} satisfies Prisma.StudentClassFindManyArgs;

type StudentWithClasses = Prisma.StudentInfoGetPayload<{
  include: {
    studentClasses: typeof studentClassDetailInclude;
  };
}>;

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
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeStudentListItem(student: StudentWithClasses) {
    return {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      accountBalance: student.accountBalance,
      school: student.school,
      province: student.province,
      status: student.status,
      gender: student.gender,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      studentClasses: student.studentClasses.map((studentClass) => ({
        class: {
          id: studentClass.class.id,
          name: studentClass.class.name,
        },
      })),
    };
  }

  private serializeStudentDetail(student: StudentWithClasses) {
    return {
      ...this.serializeStudentListItem(student),
      birthYear: student.birthYear,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      goal: student.goal,
      dropOutDate: student.dropOutDate,
      studentClasses: student.studentClasses.map((studentClass) => {
        const customTuitionPerSession = normalizeNullableMoney(
          studentClass.customStudentTuitionPerSession,
        );
        const customTuitionPackageTotal = normalizeNullableMoney(
          studentClass.customTuitionPackageTotal,
        );
        const customTuitionPackageSession = normalizeNullableMoney(
          studentClass.customTuitionPackageSession,
        );
        const effectiveTuitionPackageTotal =
          customTuitionPackageTotal ??
          normalizeNullableMoney(studentClass.class.tuitionPackageTotal);
        const effectiveTuitionPackageSession =
          customTuitionPackageSession ??
          normalizeNullableMoney(studentClass.class.tuitionPackageSession);
        const effectiveTuitionPerSession = resolveEffectiveTuitionPerSession({
          customTuitionPerSession,
          classTuitionPerSession: studentClass.class.studentTuitionPerSession,
          effectivePackageTotal: effectiveTuitionPackageTotal,
          effectivePackageSession: effectiveTuitionPackageSession,
        });

        return {
          class: {
            id: studentClass.class.id,
            name: studentClass.class.name,
          },
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
                normalizeNullableMoney(
                  studentClass.class.studentTuitionPerSession,
                ) != null
              ? 'class'
              : 'unset',
        };
      }),
    };
  }

  private buildUpdateData(dto: UpdateStudentBodyDto) {
    const data: Record<string, unknown> = {};

    if (dto.full_name !== undefined) data.fullName = dto.full_name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.school !== undefined) data.school = dto.school;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.birth_year !== undefined) data.birthYear = dto.birth_year;
    if (dto.parent_name !== undefined) data.parentName = dto.parent_name;
    if (dto.parent_phone !== undefined) data.parentPhone = dto.parent_phone;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.goal !== undefined) data.goal = dto.goal;

    if (dto.drop_out_date !== undefined) {
      const date = new Date(dto.drop_out_date);
      data.dropOutDate = Number.isNaN(date.getTime()) ? undefined : date;
    }

    return data as Parameters<typeof this.prisma.studentInfo.update>[0]['data'];
  }

  async getStudents(query: StudentListQueryDto) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;

    const trimmedSearch = query.search?.trim();
    const trimmedSchool = query.school?.trim();
    const trimmedProvince = query.province?.trim();
    const trimmedClassName = query.className?.trim();
    const normalizedStatus = query.status?.trim();
    const normalizedGender = query.gender?.trim();

    const statusFilter: StudentStatus | undefined =
      normalizedStatus === StudentStatus.active
        ? StudentStatus.active
        : normalizedStatus === StudentStatus.inactive
          ? StudentStatus.inactive
          : undefined;

    const genderFilter: Gender | undefined =
      normalizedGender === Gender.male
        ? Gender.male
        : normalizedGender === Gender.female
          ? Gender.female
          : undefined;

    const where: Prisma.StudentInfoWhereInput = {
      ...(trimmedSearch
        ? {
            fullName: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedSchool
        ? {
            school: {
              contains: trimmedSchool,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedProvince
        ? {
            province: {
              contains: trimmedProvince,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(genderFilter ? { gender: genderFilter } : {}),
      ...(trimmedClassName
        ? {
            studentClasses: {
              some: {
                class: {
                  name: {
                    contains: trimmedClassName,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          }
        : {}),
    };

    const total = await this.prisma.studentInfo.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.studentInfo.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { accountBalance: 'asc' },
        { status: 'asc' },
        { fullName: 'asc' },
      ],
      include: {
        studentClasses: studentClassDetailInclude,
      },
    });

    return {
      data: data.map((student) => this.serializeStudentListItem(student)),
      meta: {
        total,
        page: safePage,
        limit,
      },
    };
  }

  async getStudentById(id: string) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      include: {
        studentClasses: studentClassDetailInclude,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.serializeStudentDetail(student);
  }

  async updateStudentById(id: string, dto: UpdateStudentBodyDto) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const updateData = this.buildUpdateData(dto);
    if (Object.keys(updateData).length === 0) {
      return this.getStudentById(id);
    }

    const updated = await this.prisma.studentInfo.update({
      where: { id },
      data: updateData,
      include: {
        studentClasses: studentClassDetailInclude,
      },
    });

    return this.serializeStudentDetail(updated);
  }

  async updateStudent(data: UpdateStudentDto) {
    return this.updateStudentById(data.id, data);
  }

  async updateStudentAccountBalance(
    data: UpdateStudentAccountBalanceCreateDto,
  ) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id: data.student_id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const updated = await this.prisma.studentInfo.update({
      where: { id: data.student_id },
      data: { accountBalance: { increment: data.amount } },
      include: {
        studentClasses: studentClassDetailInclude,
      },
    });

    return this.serializeStudentDetail(updated);
  }

  async updateStudentClasses(id: string, dto: UpdateStudentClassesDto) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const classIds = Array.from(new Set(dto.class_ids));
    if (classIds.length > 0) {
      const classes = await this.prisma.class.findMany({
        where: {
          id: {
            in: classIds,
          },
        },
        select: { id: true },
      });

      if (classes.length !== classIds.length) {
        throw new NotFoundException('One or more classes not found');
      }
    }

    const existingMemberships = await this.prisma.studentClass.findMany({
      where: { studentId: id },
      select: { classId: true },
    });
    const existingClassIds = new Set(
      existingMemberships.map((membership) => membership.classId),
    );
    const classIdsToRemove = existingMemberships
      .map((membership) => membership.classId)
      .filter((classId) => !classIds.includes(classId));
    const classIdsToAdd = classIds.filter(
      (classId) => !existingClassIds.has(classId),
    );

    await this.prisma.$transaction(async (tx) => {
      if (classIdsToRemove.length > 0) {
        await tx.studentClass.deleteMany({
          where: {
            studentId: id,
            classId: {
              in: classIdsToRemove,
            },
          },
        });
      }

      if (classIds.length === 0) {
        return;
      }

      if (classIdsToAdd.length > 0) {
        await tx.studentClass.createMany({
          data: classIdsToAdd.map((classId) => ({
            classId,
            studentId: id,
          })),
        });
      }
    });

    return this.getStudentById(id);
  }

  async deleteStudent(id: string) {
    return await this.prisma.studentInfo.delete({
      where: {
        id,
      },
    });
  }

  async createStudent(data: CreateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.user_id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return await this.prisma.studentInfo.create({
      data: {
        fullName: data.full_name,
        email: data.email,
        school: data.school,
        province: data.province,
        birthYear: data.birth_year,
        parentName: data.parent_name,
        parentPhone: data.parent_phone,
        status: data.status,
        gender: data.gender,
        goal: data.goal,
        userId: data.user_id,
      },
    });
  }
}
