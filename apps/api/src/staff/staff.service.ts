import { Injectable, NotFoundException } from '@nestjs/common';
import { StaffStatus } from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateStaffDto, UpdateStaffDto } from 'src/dtos/staff.dto';
import { PrismaService } from 'src/prisma/prisma.service';

/** Prisma expects DateTime; normalize date-only string (YYYY-MM-DD) to Date. */
function toDateOrNull(
  value: string | Date | null | undefined,
): Date | null | undefined {
  if (value == null) return value;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return undefined;
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) { }

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
      orderBy: [
        {
          status: 'asc',
        },
        {
          fullName: 'asc'
        }
      ],
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
    const tx = await this.prisma.$transaction(async (tx) => {
      const staff = await tx.staffInfo.findUnique({
        where: {
          id,
        },
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

      if (!staff) {
        throw new NotFoundException('Staff not found');
      }

      const classAllowance = await tx.$queryRaw`
      SELECT class_id, teacher_payment_status, SUM(teacher_allowance_total) as total_allowance, classes.name
      from
        (SELECT
          attendance.session_id,
          sessions.class_id,
          sessions.allowance_amount,
          classes.scale_amount,
          sessions.teacher_payment_status,
          COUNT( CASE WHEN attendance.status = 'present' OR attendance.status = 'excused' THEN 1 END ) as student_count,
          LEAST(classes.max_allowance_per_session , (sessions.coefficient * (sessions.allowance_amount * COUNT(CASE WHEN attendance.status = 'present' OR attendance.status = 'excused'  THEN 1 END) + classes.scale_amount))) AS teacher_allowance_total
        from attendance
        join sessions on attendance.session_id = sessions.id
        join classes on classes.id = sessions.class_id
        where sessions.teacher_id=${id}
        group by sessions.class_id, attendance.session_id, sessions.allowance_amount, classes.scale_amount, sessions.teacher_payment_status, classes.max_allowance_per_session, sessions.coefficient) as tab
      join classes on classes.id = class_id
      group by tab.class_id, teacher_payment_status , classes.name
      `;

      return {
        ...staff,
        classAllowance,
      };
    });

    return tx;
  }

  async updateStaff(data: UpdateStaffDto) {
    const payload: Record<string, unknown> = {};
    if (data.full_name != null) payload.fullName = data.full_name;
    const birthDateNorm = toDateOrNull(data.birth_date);
    if (birthDateNorm !== undefined) payload.birthDate = birthDateNorm;
    if (data.university != null) payload.university = data.university;
    if (data.high_school != null) payload.highSchool = data.high_school;
    if (data.specialization != null)
      payload.specialization = data.specialization;
    if (data.bank_account != null) payload.bankAccount = data.bank_account;
    if (data.bank_qr_link != null) payload.bankQrLink = data.bank_qr_link;
    if (data.roles != null) payload.roles = data.roles;
    if (data.user_id != null) payload.userId = data.user_id;
    if (data.status != null) payload.status = data.status;

    return await this.prisma.staffInfo.update({
      where: { id: data.id },
      data: payload as Parameters<
        typeof this.prisma.staffInfo.update
      >[0]['data'],
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
        birthDate: toDateOrNull(data.birth_date) ?? undefined,
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
