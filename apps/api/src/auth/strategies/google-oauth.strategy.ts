import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from 'generated/enums';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        readonly config: ConfigService,
        readonly prisma: PrismaService,
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

        const name = user.fullName?.split(' ') ?? ["", ""];

        const newUser = await this.prisma.user
            .upsert({
                create: {
                    email: user.email,
                    accountHandle: user.email,
                    first_name: name[0] ?? "",
                    last_name: name?.slice(1).join(' ') ?? "",
                    roleType: UserRole.guest,
                    emailVerified: true,
                },
                update: {
                    emailVerified: true,
                },
                where: {
                    email: user.email,
                },
            })

        cb(null, newUser);
    }
}