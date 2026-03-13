import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from 'generated/enums';

export interface JwtPayload {
  id: string;
  accountHandle: string;
  roleType: UserRole;
}

export interface JwtRefreshPayload {
  user: JwtPayload;
  rememberMe: boolean;
  refreshTokenExpiresAt: Date;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | keyof JwtRefreshPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | JwtRefreshPayload | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload | JwtRefreshPayload;
    return data ? user?.[data as keyof (JwtPayload & JwtRefreshPayload)] : user;
  },
);
