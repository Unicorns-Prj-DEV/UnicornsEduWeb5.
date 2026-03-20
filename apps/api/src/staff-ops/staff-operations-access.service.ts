import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffRole, UserRole } from '../../generated/enums';
import { PrismaService } from '../prisma/prisma.service';

export interface StaffOperationsActor {
  id: string;
  roles: StaffRole[];
}

@Injectable()
export class StaffOperationsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveActor(
    userId: string,
    roleType: UserRole,
  ): Promise<StaffOperationsActor> {
    if (roleType === UserRole.admin) {
      return {
        id: userId,
        roles: [],
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

  async assertTeacherAssignedToClass(
    teacherId: string,
    classId: string,
  ): Promise<void> {
    const assignment = await this.prisma.classTeacher.findUnique({
      where: {
        classId_teacherId: {
          classId,
          teacherId,
        },
      },
      select: {
        teacherId: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Class not found');
    }
  }

  async resolveSingleTeacherForClass(classId: string): Promise<string> {
    const classTeachers = await this.prisma.classTeacher.findMany({
      where: { classId },
      select: {
        teacherId: true,
      },
    });

    if (classTeachers.length !== 1) {
      throw new BadRequestException(
        'Lớp phải có đúng 1 gia sư phụ trách trước khi Staff có thể tạo buổi học.',
      );
    }

    return classTeachers[0].teacherId;
  }
}
