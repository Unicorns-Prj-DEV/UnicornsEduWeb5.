import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { RequestWithResolvedAuthContext } from '../auth-request-context';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithResolvedAuthContext & { user?: JwtPayload }>();
    const emailVerified = request.user?.emailVerified;

    if (!emailVerified) {
      throw new ForbiddenException(
        'Vui lòng xác minh email trước khi truy cập tính năng này.',
      );
    }

    return true;
  }
}
