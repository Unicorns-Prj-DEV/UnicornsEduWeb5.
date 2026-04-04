import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthIdentityCacheService } from 'src/auth/auth-identity-cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StaffStatus, UserRole } from 'generated/enums';
import type { Server, Socket } from 'socket.io';
import type { NotificationPushEventDto } from 'src/dtos/notification.dto';

const ACCESS_TOKEN_COOKIE = 'access_token';
const STAFF_NOTIFICATION_ROOM = 'staff:all';

interface AccessTokenPayload {
  id: string;
}

interface NotificationSocketAuthContext {
  userId: string;
  staffId: string;
}

type NotificationSocketData = {
  authContext?: NotificationSocketAuthContext;
};

function parseCookies(rawCookieHeader?: string): Record<string, string> {
  if (!rawCookieHeader) {
    return {};
  }

  return rawCookieHeader
    .split(';')
    .reduce<Record<string, string>>((cookies, rawSegment) => {
      const segment = rawSegment.trim();
      if (!segment) {
        return cookies;
      }

      const separatorIndex = segment.indexOf('=');
      if (separatorIndex < 0) {
        return cookies;
      }

      const key = segment.slice(0, separatorIndex).trim();
      const rawValue = segment.slice(separatorIndex + 1);

      if (!key) {
        return cookies;
      }

      try {
        cookies[key] = decodeURIComponent(rawValue);
      } catch {
        cookies[key] = rawValue;
      }

      return cookies;
    }, {});
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authIdentityCacheService: AuthIdentityCacheService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    server.use((rawSocket, next) => {
      void this.authenticateSocket(rawSocket)
        .then((authContext) => {
          this.setAuthContext(rawSocket, authContext);
          next();
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Unauthorized';
          next(new Error(message));
        });
    });
  }

  handleConnection(client: Socket) {
    if (!this.getAuthContext(client)) {
      client.disconnect(true);
      return;
    }

    void client.join(STAFF_NOTIFICATION_ROOM);
  }

  emitNotificationPushed(payload: NotificationPushEventDto) {
    if (!this.server) {
      return;
    }

    this.server
      .to(STAFF_NOTIFICATION_ROOM)
      .emit('notification.pushed', payload);
  }

  private async authenticateSocket(
    socket: Socket,
  ): Promise<NotificationSocketAuthContext> {
    const rawCookieHeader = socket.handshake.headers.cookie;
    const accessToken = parseCookies(rawCookieHeader)[ACCESS_TOKEN_COOKIE];

    if (!accessToken) {
      throw new UnauthorizedException('Missing access token');
    }

    const payload =
      await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken);
    const identity = await this.authIdentityCacheService.getAuthIdentity(
      payload.id,
    );

    if (!identity || identity.status !== 'active') {
      throw new UnauthorizedException('Inactive account');
    }

    if (identity.roleType !== UserRole.staff) {
      throw new UnauthorizedException('Only staff can receive notifications');
    }

    const staff = await this.prisma.staffInfo.findUnique({
      where: { userId: identity.id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!staff || staff.status !== StaffStatus.active) {
      throw new UnauthorizedException('Staff profile is not available');
    }

    return {
      userId: identity.id,
      staffId: staff.id,
    };
  }

  private setAuthContext(
    socket: Socket,
    authContext: NotificationSocketAuthContext,
  ) {
    const socketData = socket.data as NotificationSocketData;
    socketData.authContext = authContext;
  }

  private getAuthContext(socket: Socket) {
    const socketData = socket.data as NotificationSocketData;
    return socketData.authContext;
  }
}
