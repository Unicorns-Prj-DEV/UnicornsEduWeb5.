import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { UserRole } from 'generated/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface EmailVerifyPayload {
    email: string;
    purpose: 'email-verify';
}

@Injectable()
export class AuthService {
    private readonly refreshTokenOptions: JwtSignOptions;
    private readonly accessTokenOptions: JwtSignOptions;
    private readonly emailVerifyTokenOptions: JwtSignOptions;
    private readonly emailVerifySecret: string;
    private readonly accessTokenExpiresIn = 60 * 15;
    private readonly refreshTokenExpiresIn = 60 * 60 * 24 * 30;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
    ) {
        this.refreshTokenOptions = {
            expiresIn: this.refreshTokenExpiresIn,
            secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        };
        this.accessTokenOptions = {
            expiresIn: this.accessTokenExpiresIn,
            secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        };
        this.emailVerifySecret = this.configService.getOrThrow<string>(
            'JWT_EMAIL_VERIFY_SECRET',
        );
        this.emailVerifyTokenOptions = {
            expiresIn: this.configService.getOrThrow<string>(
                'JWT_EMAIL_VERIFY_EXPIRES_IN',
            ) as JwtSignOptions['expiresIn'],
            secret: this.emailVerifySecret,
        };
    }

    async login(email: string, password: string): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.emailVerified) {
            throw new UnauthorizedException('Please verify your email before login');
        }

        return this.generateTokenPairAndSave(user.id, user.email, user.roleType);
    }

    async refreshTokens(
        userId: string,
        usedRefreshToken: string,
    ): Promise<TokenPair> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, roleType: true, refreshToken: true },
        });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const tokenHash = this.hashToken(usedRefreshToken);
        if (user.refreshToken !== tokenHash) {
            throw new UnauthorizedException('Invalid or already used refresh token');
        }

        return this.generateTokenPairAndSave(user.id, user.email, user.roleType);
    }

    async register(
        email: string,
        password: string,
    ): Promise<{ message: string }> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        await this.prisma.user.create({
            data: {
                email,
                passwordHash: await bcrypt.hash(password, 10),
                roleType: UserRole.guest,
            },
        });

        const verificationToken = await this.generateEmailVerificationToken(email);

        try {
            await this.mailService.sendVerificationEmail(email, verificationToken);
        } catch {
            throw new InternalServerErrorException(
                'Unable to send verification email',
            );
        }

        return { message: 'User created successfully. Please verify your email.' };
    }

    async verifyEmailToken(token: string): Promise<{ message: string }> {
        if (!token) {
            throw new BadRequestException('Verification token is required');
        }

        let payload: EmailVerifyPayload;
        try {
            payload = await this.jwtService.verifyAsync<EmailVerifyPayload>(token, {
                secret: this.emailVerifySecret,
            });
        } catch {
            throw new BadRequestException('Invalid or expired verification token');
        }

        if (payload.purpose !== 'email-verify' || !payload.email) {
            throw new BadRequestException('Invalid verification token payload');
        }

        const user = await this.prisma.user.findUnique({
            where: { email: payload.email },
            select: { emailVerified: true },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (user.emailVerified) {
            return { message: 'Email already verified' };
        }

        await this.prisma.user.update({
            where: { email: payload.email },
            data: { emailVerified: true },
        });

        return { message: 'Email verified successfully' };
    }

    private async generateTokenPairAndSave(
        userId: string,
        email: string,
        role: string,
    ): Promise<TokenPair> {
        const payload = { sub: userId, email, role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, this.accessTokenOptions),
            this.jwtService.signAsync(payload, this.refreshTokenOptions),
        ]);
        const refreshTokenHash = this.hashToken(refreshToken);
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: refreshTokenHash },
        });
        return {
            accessToken,
            refreshToken,
        };
    }

    private async generateEmailVerificationToken(email: string): Promise<string> {
        const payload: EmailVerifyPayload = { email, purpose: 'email-verify' };
        return this.jwtService.signAsync(payload, this.emailVerifyTokenOptions);
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
