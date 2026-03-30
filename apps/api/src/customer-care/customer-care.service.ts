import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, StaffRole, UserRole } from 'generated/enums';
import type {
  CustomerCareCommissionDto,
  CustomerCareSessionCommissionDto,
  CustomerCareStudentDto,
} from 'src/dtos/customer-care.dto';
import { PrismaService } from 'src/prisma/prisma.service';

const DEFAULT_DAYS = 30;

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class CustomerCareService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveStaffProfile(userId: string) {
    return this.prisma.staffInfo.findFirst({
      where: { userId },
      select: {
        id: true,
        roles: true,
      },
    });
  }

  private async resolveAccessibleStaffId(
    userId: string,
    roleType: UserRole,
    requestedStaffId: string,
  ) {
    if (roleType === UserRole.admin) {
      return requestedStaffId;
    }

    if (roleType !== UserRole.staff) {
      throw new ForbiddenException(
        'Chỉ admin hoặc staff.customer_care mới được xem dữ liệu customer-care.',
      );
    }

    const staff = await this.resolveStaffProfile(userId);

    if (!staff) {
      throw new ForbiddenException(
        'Tài khoản staff hiện tại chưa có hồ sơ nhân sự để dùng màn CSKH.',
      );
    }

    if (staff.roles.includes(StaffRole.assistant)) {
      return requestedStaffId;
    }

    if (!staff.roles.includes(StaffRole.customer_care)) {
      throw new ForbiddenException(
        'Màn CSKH chỉ mở cho admin, trợ lí, hoặc staff có role customer_care.',
      );
    }

    if (staff.id !== requestedStaffId) {
      throw new ForbiddenException(
        'Nhân sự CSKH chỉ được xem dữ liệu của chính mình.',
      );
    }

    return staff.id;
  }

  /** List students assigned to this staff in customer_care_service, sorted by accountBalance asc. */
  async getStudentsByStaffId(
    userId: string,
    roleType: UserRole,
    staffId: string,
  ): Promise<CustomerCareStudentDto[]> {
    const accessibleStaffId = await this.resolveAccessibleStaffId(
      userId,
      roleType,
      staffId,
    );

    const staff = await this.prisma.staffInfo.findUnique({
      where: { id: accessibleStaffId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const list = await this.prisma.customerCareService.findMany({
      where: { staffId: accessibleStaffId },
      select: {
        student: {
          select: {
            id: true,
            fullName: true,
            accountBalance: true,
            province: true,
            status: true,
            studentClasses: {
              select: {
                class: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: {
        student: {
          accountBalance: 'asc',
        },
      },
    });

    return list.map((row) => ({
      id: row.student.id,
      fullName: row.student.fullName ?? '',
      accountBalance: row.student.accountBalance ?? 0,
      province: row.student.province ?? null,
      status: row.student.status,
      classes: row.student.studentClasses.map((studentClass) => ({
        id: studentClass.class.id,
        name: studentClass.class.name,
      })),
    }));
  }

  /** List students with total commission (last 30 days) for this staff. */
  async getCommissionsByStaffId(
    userId: string,
    roleType: UserRole,
    staffId: string,
    days: number = DEFAULT_DAYS,
  ): Promise<CustomerCareCommissionDto[]> {
    const accessibleStaffId = await this.resolveAccessibleStaffId(
      userId,
      roleType,
      staffId,
    );

    const staff = await this.prisma.staffInfo.findUnique({
      where: { id: accessibleStaffId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        customerCareStaffId: accessibleStaffId,
        session: { date: { gte: since } },
      },
      select: {
        studentId: true,
        tuitionFee: true,
        customerCareCoef: true,
        student: { select: { id: true, fullName: true } },
      },
    });

    const byStudent = new Map<
      string,
      { studentId: string; fullName: string; totalCommission: number }
    >();

    for (const attendance of attendances) {
      const tuition = toNumber(attendance.tuitionFee);
      const coef = toNumber(attendance.customerCareCoef);
      const commission = Math.round(tuition * coef);
      const existing = byStudent.get(attendance.studentId);
      if (existing) {
        existing.totalCommission += commission;
      } else {
        byStudent.set(attendance.studentId, {
          studentId: attendance.student.id,
          fullName: attendance.student.fullName ?? '',
          totalCommission: commission,
        });
      }
    }

    return Array.from(byStudent.values());
  }

  /** Session-level commissions for one student under this staff (last N days). */
  async getSessionCommissionsByStudent(
    userId: string,
    roleType: UserRole,
    staffId: string,
    studentId: string,
    days: number = DEFAULT_DAYS,
  ): Promise<CustomerCareSessionCommissionDto[]> {
    const accessibleStaffId = await this.resolveAccessibleStaffId(
      userId,
      roleType,
      staffId,
    );

    const staff = await this.prisma.staffInfo.findUnique({
      where: { id: accessibleStaffId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        customerCareStaffId: accessibleStaffId,
        studentId,
        session: { date: { gte: since } },
      },
      select: {
        tuitionFee: true,
        customerCareCoef: true,
        customerCarePaymentStatus: true,
        session: {
          select: {
            id: true,
            date: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
    });

    return attendances.map((attendance) => {
      const tuition = toNumber(attendance.tuitionFee);
      const coef = toNumber(attendance.customerCareCoef);
      const commission = Math.round(tuition * coef);
      return {
        sessionId: attendance.session.id,
        date: attendance.session.date.toISOString(),
        className: attendance.session.class?.name ?? null,
        tuitionFee: tuition,
        customerCareCoef: coef,
        commission,
        paymentStatus:
          attendance.customerCarePaymentStatus ?? PaymentStatus.pending,
      };
    });
  }
}
