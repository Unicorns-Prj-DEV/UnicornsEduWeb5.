import { StaffRole, UserRole } from 'generated/enums';
import { TokenPair } from 'src/auth/auth.service';

export interface AuthProfileDto {
  id: string;
  email: string;
  emailVerified: boolean;
  canAccessRestrictedRoutes: boolean;
  accountHandle: string;
  roleType: UserRole;
  requiresPasswordSetup: boolean;
  avatarUrl: string | null;
  staffRoles: StaffRole[];
  hasStaffProfile: boolean;
  hasStudentProfile: boolean;
}

export interface LoginResponseDto {
  id: string;
  accountHandle: string;
  roleType: UserRole;
  avatarUrl: string | null;
  tokenPair: TokenPair;
}
