import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from 'generated/enums';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ActionHistoryService } from 'src/action-history/action-history.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    readonly config: ConfigService,
    readonly prisma: PrismaService,
    readonly actionHistoryService: ActionHistoryService,
  ) {
    const options = {
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    };
    super(options);
  }

  authorizationParams(): { [key: string]: string } {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  async validate(
    _access_token: string,
    _refresh_token: string,
    profile: Profile,
    cb: VerifyCallback,
  ) {
    const user = {
      email: profile.emails![0].value,
      fullName:
        `${profile.name?.givenName || ''} ${profile.name?.middleName || ''} ${profile.name?.familyName || ''}`.trim() ||
        undefined,
      avatar: profile.photos![0].value,
      // accessToken: _access_token,
      // refreshToken: _refresh_token,
    };

    const name = user.fullName?.split(' ') ?? ['', ''];

    const newUser = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: user.email },
        include: {
          staffInfo: true,
          studentInfo: true,
        },
      });

      if (existingUser?.emailVerified) {
        return existingUser;
      }

      if (existingUser) {
        const updatedUser = await tx.user.update({
          where: { email: user.email },
          data: {
            emailVerified: true,
          },
        });

        const afterValue = await tx.user.findUnique({
          where: { id: updatedUser.id },
          include: {
            staffInfo: true,
            studentInfo: true,
          },
        });
        if (afterValue) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: {
              userId: updatedUser.id,
              userEmail: updatedUser.email,
              roleType: updatedUser.roleType,
            },
            entityType: 'user',
            entityId: updatedUser.id,
            description: 'Xác thực người dùng qua Google',
            beforeValue: existingUser,
            afterValue,
          });
        }

        return updatedUser;
      }

      const createdUser = await tx.user.create({
        data: {
          email: user.email,
          accountHandle: user.email,
          first_name: name[0] ?? '',
          last_name: name?.slice(1).join(' ') ?? '',
          roleType: UserRole.guest,
          emailVerified: true,
        },
      });

      const afterValue = await tx.user.findUnique({
        where: { id: createdUser.id },
        include: {
          staffInfo: true,
          studentInfo: true,
        },
      });
      if (afterValue) {
        await this.actionHistoryService.recordCreate(tx, {
          actor: {
            userId: createdUser.id,
            userEmail: createdUser.email,
            roleType: createdUser.roleType,
          },
          entityType: 'user',
          entityId: createdUser.id,
          description: 'Tạo người dùng qua Google',
          afterValue,
        });
      }

      return createdUser;
    });

    cb(null, newUser);
  }
}
