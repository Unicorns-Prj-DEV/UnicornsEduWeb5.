import { Injectable } from '@nestjs/common';
import { StaffRole, UserRole } from 'generated/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthIdentityCacheService } from './auth-identity-cache.service';
import type {
  CachedAuthIdentity,
  RequestWithResolvedAuthContext,
} from './auth-request-context';

export type AuthWorkspace = 'admin' | 'staff' | 'student';
export type AdminAccessTier =
  | 'full'
  | 'assistant'
  | 'accountant'
  | 'lesson_plan_head'
  | null;

export interface ResolvedAuthAccess {
  effectiveRoleTypes: UserRole[];
  staffRoles: StaffRole[];
  hasStaffProfile: boolean;
  hasStudentProfile: boolean;
  staffProfileComplete: boolean;
  availableWorkspaces: AuthWorkspace[];
  defaultWorkspace: AuthWorkspace | null;
  preferredRedirect: string;
  access: {
    admin: {
      canAccess: boolean;
      tier: AdminAccessTier;
    };
    staff: {
      canAccess: boolean;
      profileComplete: boolean;
    };
    student: {
      canAccess: boolean;
    };
  };
}

type StaffProfileForAccess = {
  id: string;
  cccdNumber: string | null;
  cccdIssuedDate: Date | string | null;
  cccdIssuedPlace: string | null;
  birthDate: Date | string | null;
  university: string | null;
  highSchool: string | null;
  specialization: string | null;
  bankAccount: string | null;
  bankQrLink: string | null;
  cccdFrontPath: string | null;
  cccdBackPath: string | null;
};

function appendUniqueRole(roles: UserRole[], role: UserRole) {
  if (!roles.includes(role)) {
    roles.push(role);
  }
}

function isValidCccd(value: string | null | undefined) {
  return typeof value === 'string' && /^\d{12}$/.test(value.trim());
}

function hasText(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    return true;
  }

  return typeof value === 'string' && value.trim().length > 0;
}

function isStaffProfileComplete(staff: StaffProfileForAccess | null) {
  if (!staff) {
    return false;
  }

  return (
    isValidCccd(staff.cccdNumber) &&
    hasText(staff.cccdIssuedDate) &&
    hasText(staff.cccdIssuedPlace) &&
    hasText(staff.birthDate) &&
    hasText(staff.university) &&
    hasText(staff.highSchool) &&
    hasText(staff.specialization) &&
    hasText(staff.bankAccount) &&
    hasText(staff.bankQrLink) &&
    hasText(staff.cccdFrontPath) &&
    hasText(staff.cccdBackPath)
  );
}

function resolveAdminTier(
  roleType: UserRole,
  staffRoles: StaffRole[],
): AdminAccessTier {
  if (roleType === UserRole.admin || staffRoles.includes(StaffRole.admin)) {
    return 'full';
  }

  if (staffRoles.includes(StaffRole.assistant)) {
    return 'assistant';
  }

  if (staffRoles.includes(StaffRole.accountant)) {
    return 'accountant';
  }

  if (staffRoles.includes(StaffRole.lesson_plan_head)) {
    return 'lesson_plan_head';
  }

  return null;
}

function resolvePreferredRedirect(adminTier: AdminAccessTier) {
  if (adminTier === 'full' || adminTier === 'assistant') {
    return '/admin/dashboard';
  }

  if (adminTier === 'accountant') {
    return '/admin/classes';
  }

  if (adminTier === 'lesson_plan_head') {
    return '/admin/lesson-plans';
  }

  return null;
}

@Injectable()
export class AuthAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authIdentityCacheService: AuthIdentityCacheService,
  ) {}

  async resolveForUserId(
    userId: string,
    request?: RequestWithResolvedAuthContext,
  ): Promise<ResolvedAuthAccess | null> {
    if (request?.resolvedAuthAccess) {
      return request.resolvedAuthAccess;
    }

    const user = await this.authIdentityCacheService.getAuthIdentity(
      userId,
      request,
    );

    if (!user) {
      if (request) {
        request.resolvedAuthAccess = null;
      }
      return null;
    }

    return this.resolveForIdentity(user, request);
  }

  async resolveForIdentity(
    user: CachedAuthIdentity,
    request?: RequestWithResolvedAuthContext,
  ): Promise<ResolvedAuthAccess> {
    if (request?.resolvedAuthAccess) {
      return request.resolvedAuthAccess;
    }

    const profileLinks = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        staffInfo: {
          select: {
            id: true,
            cccdNumber: true,
            cccdIssuedDate: true,
            cccdIssuedPlace: true,
            birthDate: true,
            university: true,
            highSchool: true,
            specialization: true,
            bankAccount: true,
            bankQrLink: true,
            cccdFrontPath: true,
            cccdBackPath: true,
          },
        },
        studentInfo: { select: { id: true } },
      },
    });

    const hasStaffProfile = Boolean(profileLinks?.staffInfo?.id);
    const hasStudentProfile = Boolean(profileLinks?.studentInfo?.id);
    const staffRoles = hasStaffProfile
      ? await this.authIdentityCacheService.getStaffRoles(user.id, request)
      : [];
    const adminTier = resolveAdminTier(user.roleType, staffRoles);
    const effectiveRoleTypes: UserRole[] = [];

    if (user.roleType !== UserRole.guest) {
      appendUniqueRole(effectiveRoleTypes, user.roleType);
      if (hasStaffProfile) {
        appendUniqueRole(effectiveRoleTypes, UserRole.staff);
      }
      if (hasStudentProfile) {
        appendUniqueRole(effectiveRoleTypes, UserRole.student);
      }
      if (adminTier === 'full') {
        appendUniqueRole(effectiveRoleTypes, UserRole.admin);
      }
    } else {
      appendUniqueRole(effectiveRoleTypes, UserRole.guest);
    }

    const availableWorkspaces: AuthWorkspace[] = [];
    if (adminTier !== null) {
      availableWorkspaces.push('admin');
    }
    if (hasStaffProfile) {
      availableWorkspaces.push('staff');
    }
    if (hasStudentProfile) {
      availableWorkspaces.push('student');
    }

    const defaultWorkspace =
      availableWorkspaces[0] ??
      (user.roleType === UserRole.admin ? 'admin' : null);
    const adminRedirect = resolvePreferredRedirect(adminTier);
    const preferredRedirect =
      adminRedirect ??
      (hasStaffProfile ? '/staff' : hasStudentProfile ? '/student' : '/');
    const staffProfileComplete = isStaffProfileComplete(
      profileLinks?.staffInfo ?? null,
    );

    const access: ResolvedAuthAccess = {
      effectiveRoleTypes,
      staffRoles,
      hasStaffProfile,
      hasStudentProfile,
      staffProfileComplete,
      availableWorkspaces,
      defaultWorkspace,
      preferredRedirect,
      access: {
        admin: {
          canAccess: adminTier !== null,
          tier: adminTier,
        },
        staff: {
          canAccess: hasStaffProfile,
          profileComplete: staffProfileComplete,
        },
        student: {
          canAccess: hasStudentProfile,
        },
      },
    };

    if (request) {
      request.resolvedAuthAccess = access;
    }

    return access;
  }
}
