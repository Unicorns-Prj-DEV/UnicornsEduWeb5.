import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffRole, UserRole } from '../../generated/enums';
import { PrismaService } from '../prisma/prisma.service';
import { hasAnyStaffRole } from '../common/staff-role-policy';

export interface StaffOperationsActor {
  id: string;
  roles: StaffRole[];
}

export type StaffClassViewAccessMode =
  | 'admin'
  | 'teacher'
  | 'customer_care'
  | 'training_manager';
export type StaffCalendarAccessMode = 'admin' | 'teacher' | 'training';

const ELEVATED_CLASS_ACCESS_ROLES = [
  StaffRole.admin,
  StaffRole.accountant_income,
  StaffRole.accountant_expense,
] as const;

@Injectable()
export class StaffOperationsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  hasElevatedClassAccess(roles: StaffRole[]) {
    return hasAnyStaffRole(roles, ELEVATED_CLASS_ACCESS_ROLES);
  }

  private async resolveStaffActor(
    userId: string,
  ): Promise<StaffOperationsActor> {
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

    return staff;
  }

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

    const staff = await this.resolveStaffActor(userId);

    if (
      !staff.roles.includes(StaffRole.teacher) &&
      !hasTrainingAccess(staff.roles) &&
      !this.hasElevatedClassAccess(staff.roles)
    ) {
      throw new ForbiddenException(
        'Màn /staff hiện chỉ mở cho teacher, Đào Tạo, kế toán, hoặc staff admin.',
      );
    }

    return staff;
  }

  async resolveCalendarActor(
    userId: string,
    roleType: UserRole,
  ): Promise<
    StaffOperationsActor & { calendarAccessMode: StaffCalendarAccessMode }
  > {
    if (roleType === UserRole.admin) {
      return {
        id: userId,
        roles: [],
        calendarAccessMode: 'admin',
      };
    }

    const staff = await this.resolveStaffActor(userId);

    if (hasTrainingAccess(staff.roles)) {
      return { ...staff, calendarAccessMode: 'training' };
    }

    if (staff.roles.includes(StaffRole.teacher)) {
      return { ...staff, calendarAccessMode: 'teacher' };
    }

    throw new ForbiddenException(
      'Lịch staff hiện chỉ mở cho teacher hoặc Đào Tạo.',
    );
  }

  async resolveClassViewerActor(
    userId: string,
    roleType: UserRole,
  ): Promise<StaffOperationsActor> {
    if (roleType === UserRole.admin) {
      return {
        id: userId,
        roles: [],
      };
    }

    const staff = await this.resolveStaffActor(userId);

    if (
      !staff.roles.includes(StaffRole.teacher) &&
      !staff.roles.includes(StaffRole.customer_care) &&
      !hasTrainingAccess(staff.roles) &&
      !this.hasElevatedClassAccess(staff.roles)
    ) {
      throw new ForbiddenException(
        'Màn chi tiết lớp chỉ mở cho teacher, CSKH, Đào Tạo, kế toán, hoặc staff admin.',
      );
    }

    return staff;
  }

  /**
   * Quyền chỉnh gia sư / lương gia sư của lớp từ staff workspace.
   * Admin (user hoặc staff role): toàn quyền (#267: Trợ lí không còn quyền này). Ban Đào Tạo: chỉ lớp
   * có `training_manager_staff_id` là chính mình, và không được đụng dòng của
   * chính mình (`lockedTeacherId`).
   */
  async resolveClassTeacherManagerScope(
    userId: string,
    roleType: UserRole,
    classId: string,
  ): Promise<{ lockedTeacherId: string | null }> {
    if (roleType === UserRole.admin) {
      return { lockedTeacherId: null };
    }

    const staff = await this.resolveStaffActor(userId);

    if (staff.roles.includes(StaffRole.admin)) {
      return { lockedTeacherId: null };
    }

    if (hasTrainingAccess(staff.roles)) {
      const managedClass = await this.prisma.class.findFirst({
        where: { id: classId, trainingManagerStaffId: staff.id },
        select: { id: true },
      });

      if (managedClass) {
        return { lockedTeacherId: staff.id };
      }
    }

    throw new ForbiddenException(
      'Chỉ quản lý lớp (Đào Tạo) hoặc Admin mới được chỉnh gia sư của lớp này.',
    );
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

  async resolveClassViewAccessMode(
    actor: StaffOperationsActor,
    classId: string,
  ): Promise<StaffClassViewAccessMode> {
    if (actor.roles.length === 0) {
      return 'admin';
    }

    if (this.hasElevatedClassAccess(actor.roles)) {
      return 'admin';
    }

    if (actor.roles.includes(StaffRole.teacher)) {
      const teacherAssignment = await this.prisma.classTeacher.findUnique({
        where: {
          classId_teacherId: {
            classId,
            teacherId: actor.id,
          },
        },
        select: {
          teacherId: true,
        },
      });

      if (teacherAssignment) {
        return 'teacher';
      }
    }

    if (actor.roles.includes(StaffRole.customer_care)) {
      const customerCareAssignment =
        await this.prisma.customerCareService.findFirst({
          where: {
            staffId: actor.id,
            student: {
              studentClasses: {
                some: {
                  classId,
                },
              },
            },
          },
          select: {
            id: true,
          },
        });

      if (customerCareAssignment) {
        return 'customer_care';
      }
    }

    if (hasTrainingAccess(actor.roles)) {
      const managedClass = await this.prisma.class.findFirst({
        where: {
          id: classId,
          trainingManagerStaffId: actor.id,
        },
        select: { id: true },
      });

      if (managedClass) {
        return 'training_manager';
      }
    }

    throw new NotFoundException('Class not found');
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
import { hasTrainingAccess } from 'src/common/training-access';
