import {
    BadRequestException,
    HttpException,
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
    purpose: 'email-verify' | 'forgot-password';
}

@Injectable()
export class AuthService {
    private readonly refreshTokenOptions: JwtSignOptions;
    private readonly accessTokenOptions: JwtSignOptions;
    private readonly emailVerifyTokenOptions: JwtSignOptions;
    private readonly forgotPasswordTokenOptions: JwtSignOptions;
    private readonly emailVerifySecret: string;
    private readonly forgotPasswordSecret: string;
    private readonly accessTokenExpiresIn = 60 * 15;
    private readonly refreshTokenExpiresIn = 60 * 60 * 24 * 30;
    private readonly forgotPasswordTokenExpiresIn = 60 * 60 * 24;
    private readonly verifyTokenExpiresIn = 60 * 60 * 24;

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
        this.emailVerifyTokenOptions = {
            expiresIn: this.verifyTokenExpiresIn,
            secret: this.configService.getOrThrow<string>('JWT_EMAIL_VERIFY_SECRET'),
        };
        this.forgotPasswordSecret = this.configService.getOrThrow<string>(
            'JWT_FORGOT_PASSWORD_SECRET',
        );
        this.forgotPasswordTokenOptions = {
            expiresIn: this.forgotPasswordTokenExpiresIn,
            secret: this.forgotPasswordSecret,
        };
        this.emailVerifySecret = this.configService.getOrThrow<string>(
            'JWT_EMAIL_VERIFY_SECRET',
        );
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

    /** Find user by email or create one for Google OAuth (emailVerified=true, random password). */
    async findOrCreateGoogleUser(
        email: string,
        name?: string,
    ): Promise<{ id: string; email: string; roleType: string }> {
        const existing = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, roleType: true },
        });
        if (existing) return existing;

        const passwordHash = await bcrypt.hash(
            crypto.randomBytes(32).toString('hex'),
            10,
        );
        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                name: name ?? null,
                roleType: UserRole.guest,
                emailVerified: true,
            },
            select: { id: true, email: true, roleType: true },
        });
        return user;
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

        const verificationToken = await this.generateEmailVerificationToken(
            email,
            'email-verify',
        );

        try {
            await this.mailService.sendVerificationEmail(email, verificationToken);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            throw new InternalServerErrorException(
                'Không gửi được email xác thực. Vui lòng thử lại hoặc liên hệ quản trị viên.',
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

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        if (!user.emailVerified) {
            throw new BadRequestException(
                'Please verify your email before resetting your password',
            );
        }

        const forgotPasswordToken = await this.generateEmailVerificationToken(
            user.email,
            'forgot-password',
        );
        try {
            await this.mailService.sendForgotPasswordEmail(
                user.email,
                forgotPasswordToken,
            );
        } catch {
            throw new InternalServerErrorException(
                'Unable to send forgot password email',
            );
        }
        return { message: 'Password reset email sent successfully' };
    }

    async generateTokenPairAndSave(
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

    async resetPassword(
        token: string,
        password: string,
    ): Promise<{ message: string }> {
        if (!token) {
            throw new BadRequestException('Reset password token is required');
        }

        let payload: EmailVerifyPayload;
        try {
            payload = await this.jwtService.verifyAsync<EmailVerifyPayload>(token, {
                secret: this.forgotPasswordSecret,
            });
        } catch {
            throw new BadRequestException('Invalid or expired reset password token');
        }

        if (payload.purpose !== 'forgot-password' || !payload.email) {
            throw new BadRequestException('Invalid reset password token payload');
        }

        const user = await this.prisma.user.findUnique({
            where: { email: payload.email },
            select: { id: true },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: await bcrypt.hash(password, 10),
                refreshToken: null,
            },
        });

        return { message: 'Password reset successfully' };
    }

    private async generateEmailVerificationToken(
        email: string,
        purpose: 'email-verify' | 'forgot-password',
    ): Promise<string> {
        const payload: EmailVerifyPayload = { email, purpose };
        const tokenOptions =
            purpose === 'forgot-password'
                ? this.forgotPasswordTokenOptions
                : this.emailVerifyTokenOptions;
        return this.jwtService.signAsync(payload, tokenOptions);
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
}
