import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { StaffRole, UserRole } from 'generated/enums';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminOnlyDeleteGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (user?.roleType === UserRole.admin) {
      return true;
    }

    if (user?.id) {
      const staff = await this.prisma.staffInfo.findUnique({
        where: { userId: user.id },
        select: { roles: true },
      });

      // #267: xoá trong admin workspace chỉ Admin (Trợ lí không còn quyền này).
      if (staff?.roles.includes(StaffRole.admin)) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Chỉ Admin mới có quyền xóa trong admin workspace.',
    );
  }
}
