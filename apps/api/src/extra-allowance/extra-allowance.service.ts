import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/client';
import { PaymentStatus, StaffRole, UserRole } from 'generated/enums';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import {
  ExtraAllowanceBulkStatusUpdateResult,
  CreateExtraAllowanceDto,
  CreateMyCommunicationExtraAllowanceDto,
  UpdateExtraAllowanceDto,
} from '../dtos/extra-allowance.dto';
import { PaginationQueryDto } from '../dtos/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExtraAllowanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  private getExtraAllowanceSnapshot(id: string) {
    return this.prisma.extraAllowance.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            roles: true,
            status: true,
          },
        },
      },
    });
  }

  async getExtraAllowances(
    query: PaginationQueryDto & {
      search?: string;
      year?: string;
      month?: string;
      roleType?: string;
      status?: string;
      staffId?: string;
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
    const year = query.year?.trim();
    const month = query.month?.trim();
    const trimmedStaffId = query.staffId?.trim();
    const normalizedRoleType = query.roleType?.trim();
    const normalizedStatus = query.status?.trim();
    const monthKey =
      year && month && /^\d{4}$/.test(year) && /^(0?[1-9]|1[0-2])$/.test(month)
        ? `${year}-${month.length === 1 ? `0${month}` : month}`
        : null;
    const roleTypeFilter: StaffRole | undefined = Object.values(
      StaffRole,
    ).includes(normalizedRoleType as StaffRole)
      ? (normalizedRoleType as StaffRole)
      : undefined;
    const statusFilter: PaymentStatus | undefined = Object.values(
      PaymentStatus,
    ).includes(normalizedStatus as PaymentStatus)
      ? (normalizedStatus as PaymentStatus)
      : undefined;

    const where: Prisma.ExtraAllowanceWhereInput = {
      ...(trimmedSearch
        ? {
            OR: [
              {
                note: {
                  contains: trimmedSearch,
                  mode: 'insensitive' as const,
                },
              },
              {
                staff: {
                  fullName: {
                    contains: trimmedSearch,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
      ...(monthKey ? { month: monthKey } : {}),
      ...(roleTypeFilter ? { roleType: roleTypeFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(trimmedStaffId ? { staffId: trimmedStaffId } : {}),
    };

    const total = await this.prisma.extraAllowance.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.extraAllowance.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            roles: true,
            status: true,
          },
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

  async getExtraAllowanceById(id: string) {
    const allowance = await this.prisma.extraAllowance.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            fullName: true,
            roles: true,
            status: true,
          },
        },
      },
    });

    if (!allowance) {
      throw new NotFoundException('Extra allowance not found');
    }

    return allowance;
  }

  /**
   * Staff self-service: only users with linked staff that includes `communication`
   * may create an extra allowance for themselves, role fixed to communication, status pending.
   */
  async createMyCommunicationExtraAllowance(
    user: { id: string; email: string; roleType: UserRole },
    data: CreateMyCommunicationExtraAllowanceDto,
  ) {
    if (user.roleType !== UserRole.staff) {
      throw new ForbiddenException(
        'Chỉ tài khoản nhân sự mới được tự tạo trợ cấp truyền thông.',
      );
    }

    const staff = await this.prisma.staffInfo.findFirst({
      where: { userId: user.id },
      select: { id: true, roles: true },
    });

    if (!staff) {
      throw new BadRequestException('User has no linked staff record');
    }

    if (!staff.roles.includes(StaffRole.communication)) {
      throw new ForbiddenException(
        'Chỉ nhân sự có role Truyền thông mới được tự thêm trợ cấp này.',
      );
    }

    return this.createExtraAllowance(
      {
        id: data.id,
        staffId: staff.id,
        month: data.month,
        amount: data.amount ?? 0,
        status: PaymentStatus.pending,
        note: data.note,
        roleType: StaffRole.communication,
      },
      {
        userId: user.id,
        userEmail: user.email,
        roleType: user.roleType,
      },
    );
  }

  async createExtraAllowance(
    data: CreateExtraAllowanceDto,
    auditActor?: ActionHistoryActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const createdAllowance = await tx.extraAllowance.create({
        data: {
          id: data.id,
          staffId: data.staffId,
          month: data.month,
          amount: data.amount ?? 0,
          status: data.status,
          note: data.note,
          roleType: data.roleType,
        },
      });

      if (auditActor) {
        const afterValue = await tx.extraAllowance.findUnique({
          where: { id: createdAllowance.id },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                roles: true,
                status: true,
              },
            },
          },
        });
        await this.actionHistoryService.recordCreate(tx, {
          actor: auditActor,
          entityType: 'extra_allowance',
          entityId: createdAllowance.id,
          description: 'Tạo trợ cấp thêm',
          afterValue,
        });
      }

      return createdAllowance;
    });
  }

  async updateExtraAllowance(
    data: UpdateExtraAllowanceDto,
    auditActor?: ActionHistoryActor,
  ) {
    if (!data.id) {
      throw new NotFoundException('Extra allowance not found');
    }

    const existingAllowance = await this.getExtraAllowanceSnapshot(data.id);

    if (!existingAllowance) {
      throw new NotFoundException('Extra allowance not found');
    }

    const updateData: Omit<UpdateExtraAllowanceDto, 'id'> = {};

    if (data.staffId !== undefined) updateData.staffId = data.staffId;
    if (data.month !== undefined) updateData.month = data.month;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.roleType !== undefined) updateData.roleType = data.roleType;

    return this.prisma.$transaction(async (tx) => {
      const updatedAllowance = await tx.extraAllowance.update({
        where: { id: data.id },
        data: updateData,
      });

      if (auditActor) {
        const afterValue = await tx.extraAllowance.findUnique({
          where: { id: data.id },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                roles: true,
                status: true,
              },
            },
          },
        });
        await this.actionHistoryService.recordUpdate(tx, {
          actor: auditActor,
          entityType: 'extra_allowance',
          entityId: data.id,
          description: 'Cập nhật trợ cấp thêm',
          beforeValue: existingAllowance,
          afterValue,
        });
      }

      return updatedAllowance;
    });
  }

  async updateExtraAllowanceStatuses(
    allowanceIds: string[],
    status: PaymentStatus,
    auditActor?: ActionHistoryActor,
  ): Promise<ExtraAllowanceBulkStatusUpdateResult> {
    const uniqueAllowanceIds = Array.from(new Set(allowanceIds));

    return this.prisma.$transaction(async (tx) => {
      const existingAllowances = await tx.extraAllowance.findMany({
        where: {
          id: {
            in: uniqueAllowanceIds,
          },
        },
        include: {
          staff: {
            select: {
              id: true,
              fullName: true,
              roles: true,
              status: true,
            },
          },
        },
      });

      if (existingAllowances.length !== uniqueAllowanceIds.length) {
        const existingIds = new Set(existingAllowances.map((item) => item.id));
        const missingAllowanceId = uniqueAllowanceIds.find(
          (allowanceId) => !existingIds.has(allowanceId),
        );

        throw new NotFoundException(
          missingAllowanceId
            ? `Extra allowance not found: ${missingAllowanceId}`
            : 'Extra allowance not found',
        );
      }

      const changedAllowanceIds = existingAllowances
        .filter(
          (allowance) => (allowance.status ?? PaymentStatus.pending) !== status,
        )
        .map((allowance) => allowance.id);

      if (changedAllowanceIds.length === 0) {
        return {
          requestedCount: uniqueAllowanceIds.length,
          updatedCount: 0,
        };
      }

      const beforeValueByAllowanceId = new Map(
        existingAllowances
          .filter((allowance) => changedAllowanceIds.includes(allowance.id))
          .map((allowance) => [allowance.id, allowance]),
      );

      await tx.extraAllowance.updateMany({
        where: {
          id: {
            in: changedAllowanceIds,
          },
        },
        data: {
          status,
        },
      });

      if (auditActor) {
        const updatedAllowances = await tx.extraAllowance.findMany({
          where: {
            id: {
              in: changedAllowanceIds,
            },
          },
          include: {
            staff: {
              select: {
                id: true,
                fullName: true,
                roles: true,
                status: true,
              },
            },
          },
        });
        const afterValueByAllowanceId = new Map(
          updatedAllowances.map((allowance) => [allowance.id, allowance]),
        );

        for (const allowanceId of changedAllowanceIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'extra_allowance',
            entityId: allowanceId,
            description: 'Cập nhật trạng thái thanh toán trợ cấp thêm',
            beforeValue: beforeValueByAllowanceId.get(allowanceId) ?? null,
            afterValue: afterValueByAllowanceId.get(allowanceId) ?? null,
          });
        }
      }

      return {
        requestedCount: uniqueAllowanceIds.length,
        updatedCount: changedAllowanceIds.length,
      };
    });
  }

  async deleteExtraAllowance(id: string, auditActor?: ActionHistoryActor) {
    const existingAllowance = await this.getExtraAllowanceSnapshot(id);

    if (!existingAllowance) {
      throw new NotFoundException('Extra allowance not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedAllowance = await tx.extraAllowance.delete({
        where: { id },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'extra_allowance',
          entityId: id,
          description: 'Xóa trợ cấp thêm',
          beforeValue: existingAllowance,
        });
      }

      return deletedAllowance;
    });
  }
}
