import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffRole, UserRole } from '../../generated/enums';
import { PrismaService } from '../prisma/prisma.service';
import { hasAnyStaffRole } from '../common/staff-role-policy';
import { hasTrainingAccess } from '../common/training-access';

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

export interface StaffClassAccess {
  mode: StaffClassViewAccessMode;
  /** Admin hệ thống hoặc staff mang role admin. */
  isAdmin: boolean;
  /** Mang role gia sư và đang được giao dạy lớp. */
  isClassTeacher: boolean;
  /** Ban Đào tạo được giao làm Quản lý lớp của lớp. */
  isClassManager: boolean;
}

export interface StaffClassWorkAccess {
  /** `staff_info.id` của actor; `null` với user admin không có hồ sơ staff. */
  staffId: string | null;
  isAdmin: boolean;
  isClassTeacher: boolean;
  isClassManager: boolean;
}

/** Admin hoặc Quản lý lớp làm được trên mọi buổi của lớp (#275). */
export function canWorkOnAllClassSessions(
  access: Pick<StaffClassWorkAccess, 'isAdmin' | 'isClassManager'>,
): boolean {
  return access.isAdmin || access.isClassManager;
}

/** Gia sư chỉ buổi do mình dạy; Admin / Quản lý lớp mọi buổi của lớp. */
export function canWorkOnClassSession(
  access: StaffClassWorkAccess,
  sessionTeacherId: string | null | undefined,
): boolean {
  if (canWorkOnAllClassSessions(access)) {
    return true;
  }
  return (
    access.isClassTeacher &&
    access.staffId !== null &&
    sessionTeacherId === access.staffId
  );
}

/**
 * Hệ số / Dạy thử: Admin, hoặc gia sư trên buổi do chính mình dạy. Quản lý lớp
 * không đổi hệ số / dạy thử trên buổi của gia sư khác (#275).
 */
export function canEditClassSessionCoefficient(
  access: StaffClassWorkAccess,
  sessionTeacherId: string | null | undefined,
): boolean {
  if (access.isAdmin) {
    return true;
  }
  return (
    access.isClassTeacher &&
    access.staffId !== null &&
    sessionTeacherId === access.staffId
  );
}

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

  /**
   * Quyền xem lớp + các cờ hợp quyền (#275). `mode` giữ thứ tự cố định
   * admin → teacher → customer_care → training_manager và chỉ dùng để chọn
   * cách redact dữ liệu xem; quyền thao tác đọc từ các cờ `isClassTeacher` /
   * `isClassManager` nên người kiêm gia sư + Quản lý lớp được hợp quyền.
   */
  async resolveClassAccess(
    actor: StaffOperationsActor,
    classId: string,
  ): Promise<StaffClassAccess> {
    if (actor.roles.length === 0) {
      return {
        mode: 'admin',
        isAdmin: true,
        isClassTeacher: false,
        isClassManager: false,
      };
    }

    const isAdmin = actor.roles.includes(StaffRole.admin);
    const [isClassTeacher, isClassManager] = await Promise.all([
      this.isTeacherOfClass(actor, classId),
      this.isManagerOfClass(actor, classId),
    ]);
    const flags = { isAdmin, isClassTeacher, isClassManager };

    if (this.hasElevatedClassAccess(actor.roles)) {
      return { mode: 'admin', ...flags };
    }

    if (isClassTeacher) {
      return { mode: 'teacher', ...flags };
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
        return { mode: 'customer_care', ...flags };
      }
    }

    if (isClassManager) {
      return { mode: 'training_manager', ...flags };
    }

    throw new NotFoundException('Class not found');
  }

  async resolveClassViewAccessMode(
    actor: StaffOperationsActor,
    classId: string,
  ): Promise<StaffClassViewAccessMode> {
    return (await this.resolveClassAccess(actor, classId)).mode;
  }

  /**
   * Quyền thao tác trên buổi học / việc của gia sư trong một lớp (#275):
   * Admin (user admin hoặc staff role admin), gia sư được giao lớp, hoặc Quản lý
   * lớp (Ban Đào tạo được giao làm quản lý lớp). Hợp quyền: người kiêm gia sư và
   * Quản lý lớp có cả hai cờ. Kế toán / CSKH / Ban Đào tạo không quản lý lớp → 403.
   */
  async resolveClassWorkAccess(
    userId: string,
    roleType: UserRole,
    classId: string,
  ): Promise<StaffClassWorkAccess> {
    if (roleType === UserRole.admin) {
      return {
        staffId: null,
        isAdmin: true,
        isClassTeacher: false,
        isClassManager: false,
      };
    }

    const staff = await this.resolveStaffActor(userId);

    if (staff.roles.includes(StaffRole.admin)) {
      return {
        staffId: staff.id,
        isAdmin: true,
        isClassTeacher: false,
        isClassManager: false,
      };
    }

    const [isClassTeacher, isClassManager] = await Promise.all([
      this.isTeacherOfClass(staff, classId),
      this.isManagerOfClass(staff, classId),
    ]);

    if (!isClassTeacher && !isClassManager) {
      throw new ForbiddenException(
        'Chỉ Admin, gia sư của lớp hoặc Quản lý lớp mới được thao tác trên lớp này.',
      );
    }

    return {
      staffId: staff.id,
      isAdmin: false,
      isClassTeacher,
      isClassManager,
    };
  }

  private async isTeacherOfClass(
    actor: StaffOperationsActor,
    classId: string,
  ): Promise<boolean> {
    if (!actor.roles.includes(StaffRole.teacher)) {
      return false;
    }

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

    return Boolean(teacherAssignment);
  }

  private async isManagerOfClass(
    actor: StaffOperationsActor,
    classId: string,
  ): Promise<boolean> {
    if (!hasTrainingAccess(actor.roles)) {
      return false;
    }

    const managedClass = await this.prisma.class.findFirst({
      where: {
        id: classId,
        trainingManagerStaffId: actor.id,
      },
      select: { id: true },
    });

    return Boolean(managedClass);
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
