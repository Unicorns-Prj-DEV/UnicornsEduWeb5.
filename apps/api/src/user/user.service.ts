import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '../../generated/client';
import { UserRole } from 'generated/enums';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from 'src/action-history/action-history.service';
import {
  UpdateMyProfileDto,
  UpdateMyStaffProfileDto,
  UpdateMyStudentProfileDto,
} from 'src/dtos/profile.dto';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateUserDto, UpdateUserDto } from 'src/dtos/user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

type UserAuditClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  private sanitizeUser<
    T extends { passwordHash: string | null; refreshToken: string | null },
  >(user: T) {
    const { passwordHash, refreshToken, ...safeUser } = user;
    return safeUser;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private isNotFoundError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    );
  }

  private getUserAuditSnapshot(db: UserAuditClient, userId: string) {
    return db.user.findUnique({
      where: { id: userId },
      include: {
        staffInfo: true,
        studentInfo: true,
      },
    });
  }

  private getStaffAuditSnapshot(db: UserAuditClient, staffId: string) {
    return db.staffInfo.findUnique({
      where: { id: staffId },
    });
  }

  private getStudentAuditSnapshot(db: UserAuditClient, studentId: string) {
    return db.studentInfo.findUnique({
      where: { id: studentId },
    });
  }

  async getUsers(query: PaginationQueryDto) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map((user) => this.sanitizeUser(user)),
      meta: { total, page, limit },
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        staffInfo: { select: { id: true, roles: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const sanitized = this.sanitizeUser(user);
    return {
      ...sanitized,
      staffInfo: user.staffInfo
        ? { id: user.staffInfo.id, roles: user.staffInfo.roles }
        : null,
    };
  }

  async createUser(data: CreateUserDto, auditActor?: ActionHistoryActor) {
    try {
      const hashedPassword = await bcrypt.hash(data.password, 10);

      return await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: data.email,
            phone: data.phone,
            passwordHash: hashedPassword,
            first_name: data.first_name,
            last_name: data.last_name,
            roleType: UserRole.guest,
            province: data.province,
            accountHandle: data.accountHandle,
          },
        });

        if (auditActor) {
          const afterValue = await this.getUserAuditSnapshot(tx, createdUser.id);
          if (afterValue) {
            await this.actionHistoryService.recordCreate(tx, {
              actor: auditActor,
              entityType: 'user',
              entityId: createdUser.id,
              description: 'Tạo người dùng',
              afterValue,
            });
          }
        }

        return this.sanitizeUser(createdUser);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Email or account handle already exists');
      }

      throw error;
    }
  }

  async updateUser(data: UpdateUserDto, auditActor?: ActionHistoryActor) {
    const existingUser = await this.getUserAuditSnapshot(this.prisma, data.id);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData = {
      email: data.email,
      phone: data.phone,
      name: data.name,
      roleType: data.roleType,
      status: data.status,
      linkId: data.linkId,
      province: data.province,
      accountHandle: data.accountHandle,
      emailVerified: data.emailVerified,
      phoneVerified: data.phoneVerified,
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: data.id },
          data: updateData,
        });

        if (auditActor) {
          const afterValue = await this.getUserAuditSnapshot(tx, data.id);
          if (afterValue) {
            await this.actionHistoryService.recordUpdate(tx, {
              actor: auditActor,
              entityType: 'user',
              entityId: data.id,
              description: 'Cập nhật người dùng',
              beforeValue: existingUser,
              afterValue,
            });
          }
        }

        return this.sanitizeUser(updatedUser);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Email or account handle already exists');
      }

      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }
  }

  async deleteUser(id: string, auditActor?: ActionHistoryActor) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        staffInfo: { select: { id: true } },
        studentInfo: { select: { id: true } },
        _count: { select: { actionHistories: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.staffInfo || user.studentInfo || user._count.actionHistories > 0) {
      throw new BadRequestException(
        'User is linked to staff, student, or action histories',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const deletedUser = await tx.user.delete({
          where: { id },
        });

        if (auditActor) {
          const { _count, ...beforeValue } = user;
          await this.actionHistoryService.recordDelete(tx, {
            actor: auditActor,
            entityType: 'user',
            entityId: id,
            description: 'Xóa người dùng',
            beforeValue,
          });
        }

        return this.sanitizeUser(deletedUser);
      });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }
  }

  /** Get full profile (user + staffInfo + studentInfo) for current user. */
  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staffInfo: true,
        studentInfo: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  /** Update current user's basic info (self). */
  async updateMyProfile(
    userId: string,
    dto: UpdateMyProfileDto,
    auditActor?: ActionHistoryActor,
  ) {
    const existing = await this.getUserAuditSnapshot(this.prisma, userId);
    if (!existing) {
      throw new UnauthorizedException('User not found');
    }
    const data: Record<string, unknown> = {};
    if (dto.first_name !== undefined) data.first_name = dto.first_name;
    if (dto.last_name !== undefined) data.last_name = dto.last_name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.accountHandle !== undefined) data.accountHandle = dto.accountHandle;
    if (Object.keys(data).length === 0) {
      return this.getFullProfile(userId);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: data as Parameters<typeof this.prisma.user.update>[0]['data'],
        });

        if (auditActor) {
          const afterValue = await this.getUserAuditSnapshot(tx, userId);
          if (afterValue) {
            await this.actionHistoryService.recordUpdate(tx, {
              actor: auditActor,
              entityType: 'user',
              entityId: userId,
              description: 'Cập nhật hồ sơ người dùng',
              beforeValue: existing,
              afterValue,
            });
          }
        }

        const updatedProfile = await tx.user.findUnique({
          where: { id: userId },
          include: {
            staffInfo: true,
            studentInfo: true,
          },
        });
        if (!updatedProfile) {
          throw new UnauthorizedException('User not found');
        }
        return this.sanitizeUser(updatedProfile);
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Email hoặc account handle đã tồn tại');
      }
      throw error;
    }
  }

  /** Update current user's staff record (self). */
  async updateMyStaffProfile(
    userId: string,
    dto: UpdateMyStaffProfileDto,
    auditActor?: ActionHistoryActor,
  ) {
    const staff = await this.prisma.staffInfo.findFirst({
      where: { userId },
    });
    if (!staff) {
      throw new BadRequestException('User has no linked staff record');
    }
    const data: Record<string, unknown> = {};
    if (dto.full_name !== undefined) data.fullName = dto.full_name;
    if (dto.birth_date !== undefined) {
      const d = new Date(dto.birth_date);
      data.birthDate = Number.isNaN(d.getTime()) ? undefined : d;
    }
    if (dto.university !== undefined) data.university = dto.university;
    if (dto.high_school !== undefined) data.highSchool = dto.high_school;
    if (dto.specialization !== undefined)
      data.specialization = dto.specialization;
    if (dto.bank_account !== undefined) data.bankAccount = dto.bank_account;
    if (dto.bank_qr_link !== undefined) data.bankQrLink = dto.bank_qr_link;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.roles !== undefined) data.roles = dto.roles;
    if (Object.keys(data).length === 0) {
      return this.getFullProfile(userId);
    }
    const beforeValue = auditActor
      ? await this.getStaffAuditSnapshot(this.prisma, staff.id)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.staffInfo.update({
        where: { id: staff.id },
        data: data as Parameters<typeof this.prisma.staffInfo.update>[0]['data'],
      });

      if (auditActor) {
        const afterValue = await this.getStaffAuditSnapshot(tx, staff.id);
        if (beforeValue && afterValue) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'staff',
            entityId: staff.id,
            description: 'Cập nhật hồ sơ nhân sự',
            beforeValue,
            afterValue,
          });
        }
      }
    });

    return this.getFullProfile(userId);
  }

  /** Update current user's student record (self). */
  async updateMyStudentProfile(
    userId: string,
    dto: UpdateMyStudentProfileDto,
    auditActor?: ActionHistoryActor,
  ) {
    const student = await this.prisma.studentInfo.findFirst({
      where: { userId },
    });
    if (!student) {
      throw new BadRequestException('User has no linked student record');
    }
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
    if (Object.keys(data).length === 0) {
      return this.getFullProfile(userId);
    }
    const beforeValue = auditActor
      ? await this.getStudentAuditSnapshot(this.prisma, student.id)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.studentInfo.update({
        where: { id: student.id },
        data: data as Parameters<
          typeof this.prisma.studentInfo.update
        >[0]['data'],
      });

      if (auditActor) {
        const afterValue = await this.getStudentAuditSnapshot(tx, student.id);
        if (beforeValue && afterValue) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'student',
            entityId: student.id,
            description: 'Cập nhật hồ sơ học sinh',
            beforeValue,
            afterValue,
          });
        }
      }
    });

    return this.getFullProfile(userId);
  }
}
