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

    if (user?.roleType === UserRole.staff) {
      const staff = await this.prisma.staffInfo.findUnique({
        where: { userId: user.id },
        select: { roles: true },
      });

      if (staff?.roles.includes(StaffRole.assistant)) {
        return true;
      }
    }

    throw new ForbiddenException(
      'Chỉ admin hoặc trợ lí mới có quyền xóa trong admin workspace.',
    );
  }
}
