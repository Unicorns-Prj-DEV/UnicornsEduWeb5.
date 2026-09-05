import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { AuthIdentityCacheService } from '../auth-identity-cache.service';
import type { RequestWithResolvedAuthContext } from '../auth-request-context';
import { UserRole } from 'generated/enums';
import { UserDeviceService } from '../user-device.service';

const ACCESS_TOKEN_COOKIE = 'access_token';

interface AccessTokenPayload {
  id: string;
  email: string;
  emailVerified?: boolean;
  accountHandle: string;
  roleType: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authIdentityCacheService: AuthIdentityCacheService,
    private readonly userDeviceService: UserDeviceService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const cookieValue: unknown = req?.cookies?.[ACCESS_TOKEN_COOKIE];
          return typeof cookieValue === 'string' ? cookieValue : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: RequestWithResolvedAuthContext,
    payload: AccessTokenPayload,
  ) {
    const user =
      req.resolvedAuthIdentity?.id === payload.id
        ? req.resolvedAuthIdentity
        : await this.authIdentityCacheService.getAuthIdentity(payload.id, req);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }

    // Students must have an active device (force-logout = no device = immediate rejection)
    if (user.roleType === UserRole.student) {
      const hasActive = await this.userDeviceService.hasActiveDevice(user.id);
      if (!hasActive) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'NO_ACTIVE_DEVICE',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        });
      }
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      accountHandle: user.accountHandle,
      roleType: user.roleType,
    };
  }
}
