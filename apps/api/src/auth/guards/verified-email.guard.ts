import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { StaffRole, UserRole } from 'generated/enums';
import { AuthIdentityCacheService } from '../auth-identity-cache.service';
import type { RequestWithResolvedAuthContext } from '../auth-request-context';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  constructor(
    private readonly authIdentityCacheService: AuthIdentityCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithResolvedAuthContext & { user?: JwtPayload }>();
    const user = request.user;

    if (user?.roleType === UserRole.admin) {
      return true;
    }

    if (user?.roleType === UserRole.staff && user.id) {
      const staffRoles = await this.authIdentityCacheService.getStaffRoles(
        user.id,
        request,
      );
      if (staffRoles.includes(StaffRole.admin)) {
        return true;
      }
    }

    if (user?.emailVerified) {
      return true;
    }
    throw new ForbiddenException(
      'Vui lòng xác minh email trước khi truy cập tính năng này.',
    );
  }
}
