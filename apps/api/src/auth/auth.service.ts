import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { UserRole } from 'generated/enums';
import { CreateUserDto } from '../dtos/user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginResponseDto } from 'src/dtos/auth.dto';

type JwtSignOptions = Parameters<JwtService['signAsync']>[1];

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
  readonly accessTokenOptions: JwtSignOptions;
  readonly emailVerifyTokenOptions: JwtSignOptions;
  readonly forgotPasswordTokenOptions: JwtSignOptions;
  readonly emailVerifySecret: string;
  readonly forgotPasswordSecret: string;
  readonly accessTokenExpiresIn = 60 * 15;
  readonly refreshTokenDefaultExpiresIn = 60 * 60 * 24;
  readonly refreshTokenRememberExpiresIn = 60 * 60 * 24 * 30;
  readonly forgotPasswordTokenExpiresIn = 60 * 60 * 24;
  readonly verifyTokenExpiresIn = 60 * 60 * 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {
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

  async login(
    accountHandle: string,
    password: string,
    rememberMe = false,
  ): Promise<LoginResponseDto> {

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ accountHandle: accountHandle }, { email: accountHandle }],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before login');
    }

    return {
      roleType: user.roleType,
      accountHandle: user.accountHandle,
      id: user.id,
      tokenPair: await this.generateTokenPairAndSave(
        user.id,
        user.accountHandle,
        user.roleType,
        rememberMe,
      ),
    };
  }

  async refreshTokens(
    userId: string,
    usedRefreshToken: string,
    rememberMe = false,
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountHandle: true,
        roleType: true,
        refreshToken: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokenPairAndSave(
      user.id,
      user.accountHandle,
      user.roleType,
      rememberMe,
    );
  }

  async register(data: CreateUserDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ accountHandle: data.accountHandle }, { email: data.email }],
      },
    });

    if (existingUser && existingUser.accountHandle === data.accountHandle) {
      throw new BadRequestException('Handle already exists');
    }

    if (existingUser && existingUser.email === data.email && existingUser.emailVerified) {
      throw new BadRequestException('Email already exists');
    }

    await this.prisma.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 10),
        first_name: data.first_name,
        last_name: data.last_name,
        roleType: UserRole.guest,
        province: data.province,
        accountHandle: data.accountHandle,
      },
      update: {
        email: data.email,
        phone: data.phone,
        passwordHash: await bcrypt.hash(data.password, 10),
        first_name: data.first_name,
        last_name: data.last_name,
        roleType: UserRole.guest,
        province: data.province,
        accountHandle: data.accountHandle,
      },
    });

    const verificationToken = await this.generateEmailVerificationToken(
      data.email,
      'email-verify',
    );

    try {
      await this.mailService.sendVerificationEmail(
        data.email,
        verificationToken,
      );
    } catch {
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
    accountHandle: string,
    roleType: UserRole,
    rememberMe = false,
  ): Promise<TokenPair> {
    const payload = { id: userId, accountHandle, roleType, rememberMe };
    const refreshTokenOptions: JwtSignOptions = {
      expiresIn: rememberMe
        ? this.refreshTokenRememberExpiresIn
        : this.refreshTokenDefaultExpiresIn,
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, this.accessTokenOptions),
      this.jwtService.signAsync(payload, refreshTokenOptions),
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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        refreshToken: null,
      },
    });

    return { message: 'Đổi mật khẩu thành công' };
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
    const token = await this.jwtService.signAsync(payload, tokenOptions);
    return token;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
