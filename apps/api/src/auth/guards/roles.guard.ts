import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole, UserRole } from 'generated/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import type { JwtPayload } from '../decorators/current-user.decorator';
import { ALLOW_ASSISTANT_ON_ADMIN_KEY } from '../decorators/allow-assistant-on-admin.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

type RequestWithResolvedStaffRoles = {
  user?: JwtPayload;
  resolvedStaffRoles?: StaffRole[];
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveStaffRoles(
    request: RequestWithResolvedStaffRoles,
  ): Promise<StaffRole[]> {
    if (request.resolvedStaffRoles) {
      return request.resolvedStaffRoles;
    }

    const userId = request.user?.id;
    if (!userId) {
      request.resolvedStaffRoles = [];
      return request.resolvedStaffRoles;
    }

    const staff = await this.prisma.staffInfo.findUnique({
      where: { userId },
      select: { roles: true },
    });

    request.resolvedStaffRoles = staff?.roles ?? [];
    return request.resolvedStaffRoles;
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

    if (
      roleType === UserRole.staff &&
      requiredRoles.includes(UserRole.admin) &&
      allowAssistantOnAdminRoutes
    ) {
      const staffRoles = await this.resolveStaffRoles(request);
      if (staffRoles.includes(StaffRole.assistant)) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Only authorized roles can access this resource',
    );
  }
}
