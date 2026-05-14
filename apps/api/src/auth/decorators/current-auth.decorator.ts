import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ResolvedAuthAccess } from '../auth-access.service';
import type { RequestWithResolvedAuthContext } from '../auth-request-context';

export const CurrentAuth = createParamDecorator(
  (
    data: keyof ResolvedAuthAccess | undefined,
    ctx: ExecutionContext,
  ):
    | ResolvedAuthAccess
    | ResolvedAuthAccess[keyof ResolvedAuthAccess]
    | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithResolvedAuthContext>();
    const auth = request.resolvedAuthAccess ?? null;
    return data && auth ? auth[data] : auth;
  },
);
