import { ForbiddenException, Injectable } from '@nestjs/common';
import type { JwtPayload } from './auth/decorators/current-user.decorator';

export function assertAdminUser(user: JwtPayload) {
  const role =
    (user as { role?: string; user?: { roleType?: string | string[] } }).role ??
    (user as { role?: string; user?: { roleType?: string | string[] } }).user
      ?.roleType;

  const isAdmin = Array.isArray(role)
    ? role.includes('admin')
    : role === 'admin';

  if (!isAdmin) {
    throw new ForbiddenException('Only admin can access this resource');
  }
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
