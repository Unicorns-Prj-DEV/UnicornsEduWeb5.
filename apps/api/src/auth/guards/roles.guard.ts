import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole, UserRole } from 'generated/enums';
import { AuthIdentityCacheService } from '../auth-identity-cache.service';
import type { RequestWithResolvedAuthContext } from '../auth-request-context';
import type { JwtPayload } from '../decorators/current-user.decorator';
import { ALLOW_ASSISTANT_ON_ADMIN_KEY } from '../decorators/allow-assistant-on-admin.decorator';
import { ALLOW_STAFF_ROLES_ON_ADMIN_KEY } from '../decorators/allow-staff-roles-on-admin.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

type RequestWithResolvedStaffRoles = RequestWithResolvedAuthContext & {
  user?: JwtPayload;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authIdentityCacheService: AuthIdentityCacheService,
  ) {}

  private async resolveStaffRoles(
    request: RequestWithResolvedStaffRoles,
  ): Promise<StaffRole[]> {
    const userId = request.user?.id;
    if (!userId) {
      return [];
    }

    return this.authIdentityCacheService.getStaffRoles(userId, request);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<RequestWithResolvedStaffRoles>();
    const { user } = request;
    const roleType = user?.roleType;

    if (roleType && requiredRoles.includes(roleType)) {
      return true;
    }

    const allowAssistantOnAdminRoutes =
      this.reflector.getAllAndOverride<boolean>(ALLOW_ASSISTANT_ON_ADMIN_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? true;
    const allowedStaffRolesOnAdminRoutes = this.reflector.getAllAndOverride<
      StaffRole[]
    >(ALLOW_STAFF_ROLES_ON_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (roleType === UserRole.staff && requiredRoles.includes(UserRole.admin)) {
      const staffRoles = await this.resolveStaffRoles(request);
      if (staffRoles.includes(StaffRole.admin)) {
        return true;
      }

      const allowedStaffRoles =
        allowedStaffRolesOnAdminRoutes ??
        (allowAssistantOnAdminRoutes ? [StaffRole.assistant] : []);

      if (
        staffRoles.some((staffRole) => allowedStaffRoles.includes(staffRole))
      ) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Only authorized roles can access this resource',
    );
  }
}
