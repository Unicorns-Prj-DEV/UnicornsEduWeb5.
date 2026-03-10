import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RefreshUserDto } from 'src/dtos/user.dto';

/** User object attached by JwtStrategy (after validate). */
export interface JwtPayload {
  user: RefreshUserDto;
  rememberMe?: boolean;
}

/**
 * Injects the current user (from JWT guard) into a route handler parameter.
 * Use with @UseGuards(JwtAuthGuard) or global JWT guard.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
