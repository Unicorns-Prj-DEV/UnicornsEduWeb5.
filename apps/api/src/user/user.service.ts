import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateUserDto, UpdateUserDto } from 'src/dtos/user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser<
    T extends { passwordHash: string; refreshToken: string | null },
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

    const users = await this.prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async createUser(data: CreateUserDto) {
    try {
      const createdUser = await this.prisma.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash: await bcrypt.hash(data.password, 10),
          name: data.name,
          roleType: UserRole.guest,
          province: data.province,
          accountHandle: data.accountHandle,
        },
      });

      return this.sanitizeUser(createdUser);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Email or account handle already exists');
      }

      throw error;
    }
  }

  async updateUser(data: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

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
      const updatedUser = await this.prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });

      return this.sanitizeUser(updatedUser);
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

  async deleteUser(id: string) {
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
      const deletedUser = await this.prisma.user.delete({
        where: { id },
      });

      return this.sanitizeUser(deletedUser);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }
  }
}
