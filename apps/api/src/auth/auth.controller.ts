import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import {
  CurrentUser,
  type JwtPayload,
  type JwtRefreshPayload,
} from './decorators/current-user.decorator';
import {
  CreateUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SetupPasswordDto,
  UserAuthDto,
} from '../dtos/user.dto';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { JwtService } from '@nestjs/jwt';

const ONE_MINUTE_IN_MS = 60_000;
const FIVE_MINUTES_IN_MS = 5 * ONE_MINUTE_IN_MS;
const THIRTY_MINUTES_IN_MS = 30 * ONE_MINUTE_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;

interface VerifiedTokenPayload {
  id: string;
  accountHandle: string;
  roleType: UserRole;
  rememberMe?: boolean;
}

interface GoogleAuthRequest extends Request {
  user: {
    id: string;
    accountHandle: string;
    roleType: UserRole;
    passwordHash?: string | null;
  };
}

function readCookie(req: Request, cookieName: string): string {
  const cookieValue: unknown = req.cookies?.[cookieName];
  return typeof cookieValue === 'string' ? cookieValue : '';
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private getGuestProfile() {
    return {
      id: '',
      accountHandle: '',
      roleType: UserRole.guest,
      requiresPasswordSetup: false,
    };
  }

  private getVerifiedAccessTokenPayload(req: Request): VerifiedTokenPayload {
    const accessToken = readCookie(req, 'access_token');
    if (!accessToken) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.jwtService.verify<VerifiedTokenPayload>(accessToken, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  private setAuthCookies(
    res: Response,
    tokenPair: { accessToken: string; refreshToken: string },
    rememberMe = false,
  ) {
    const refreshMaxAge = rememberMe
      ? this.authService.refreshTokenRememberExpiresIn * 1000
      : this.authService.refreshTokenDefaultExpiresIn * 1000;

    res.cookie('access_token', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.authService.accessTokenExpiresIn * 1000,
    });
    res.cookie('refresh_token', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshMaxAge,
    });
  }

  private buildFrontendRedirectUrl(
    path = '',
    search?: URLSearchParams,
  ): string {
    const frontendUrl = this.configService
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/$/, '');
    const query = search && search.size > 0 ? `?${search.toString()}` : '';
    return `${frontendUrl}${path}${query}`;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Throttle({ default: { limit: 20, ttl: FIVE_MINUTES_IN_MS } })
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate with accountHandle and password (accountHandle can be username or email). Returns access token and sets refresh token in cookie.',
  })
  @ApiBody({
    type: UserAuthDto,
    description:
      'accountHandle (username or email), password, and optional rememberMe',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken and refreshToken.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async login(
    @Body() body: UserAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rememberMe = body.rememberMe ?? false;
    const response = await this.authService.login(
      body.accountHandle,
      body.password,
      rememberMe,
    );
    this.setAuthCookies(res, response.tokenPair, rememberMe);

    return {
      message: 'Login successful',
      id: response.id,
      accountHandle: response.accountHandle,
      roleType: response.roleType,
    };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @Throttle({ default: { limit: 120, ttl: ONE_MINUTE_IN_MS } })
  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Exchange refresh token (cookie) for a new access token and refresh token.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns new accessToken and sets new refresh token in cookie.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async refresh(
    @CurrentUser() user: JwtRefreshPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = readCookie(req, 'refresh_token');
    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      user.user.id,
      oldRefreshToken,
      user.rememberMe,
    );

    this.setAuthCookies(res, { accessToken, refreshToken }, user.rememberMe);
    return { message: 'Refresh successful' };
  }

  @Public()
  @Get('profile')
  @ApiOperation({
    summary: 'Get profile',
    description:
      'Returns the current user profile from JWT payload. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile (id, accountHandle, role, etc.).',
  })
  async getProfile(@Req() req: Request) {
    const refreshToken = readCookie(req, 'refresh_token');

    if (!refreshToken) {
      return this.getGuestProfile();
    }

    try {
      const payload = this.jwtService.verify<VerifiedTokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
      const profile = await this.authService.getAuthProfile(payload.id);
      return profile ?? this.getGuestProfile();
    } catch {
      return this.getGuestProfile();
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: THIRTY_MINUTES_IN_MS } })
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Change password',
    description:
      'Change password for current user (requires access_token cookie).',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized or wrong current password.',
  })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async changePassword(@Req() req: Request, @Body() body: ChangePasswordDto) {
    const payload = this.getVerifiedAccessTokenPayload(req);

    if (!payload?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.authService.changePassword(
      payload.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('setup-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: THIRTY_MINUTES_IN_MS } })
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Set initial password',
    description:
      'Create the first password for the current authenticated user when the account was created via Google OAuth.',
  })
  @ApiBody({ type: SetupPasswordDto })
  @ApiResponse({ status: 200, description: 'Password set successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Password already exists or request is invalid.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async setupPassword(
    @Req() req: Request,
    @Body() body: SetupPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = this.getVerifiedAccessTokenPayload(req);
    if (!payload?.id) {
      throw new UnauthorizedException('Unauthorized');
    }

    const result = await this.authService.setupPassword(
      payload.id,
      body.password,
    );
    const tokenPair = await this.authService.generateTokenPairAndSave(
      payload.id,
      payload.accountHandle,
      payload.roleType,
      payload.rememberMe ?? false,
    );
    this.setAuthCookies(res, tokenPair, payload.rememberMe ?? false);

    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: ONE_HOUR_IN_MS } })
  @ApiOperation({
    summary: 'Register',
    description: 'Register a new user with full CreateUserDto payload.',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User registration payload',
  })
  @ApiResponse({
    status: 200,
    description: 'User created; returns tokens or confirmation message.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already exists.',
  })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('verify')
  @Throttle({ default: { limit: 30, ttl: ONE_HOUR_IN_MS } })
  @ApiOperation({
    summary: 'Verify email',
    description: 'Verify email address using token sent by email.',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Email verification token',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: ONE_HOUR_IN_MS } })
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Request a password reset link sent to the given email.',
  })
  @ApiBody({ type: ForgotPasswordDto, description: 'Email address' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists.',
  })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: ONE_HOUR_IN_MS } })
  @ApiOperation({
    summary: 'Reset password',
    description: 'Set new password using the token from forgot-password email.',
  })
  @ApiBody({ type: ResetPasswordDto, description: 'Token and new password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 429, description: 'Too many requests.' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Returns the authenticated user (same as profile). Requires access_token cookie.',
  })
  @ApiResponse({ status: 200, description: 'Current user payload.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.authService.getAuthProfile(user.id);
    if (!profile) {
      throw new UnauthorizedException('Unauthorized');
    }

    return profile;
  }

  @Post('logout')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Logout',
    description:
      'Clear access and refresh token cookies. Requires authentication.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return {
      message: 'Logged out successfully',
    };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Req() req: GoogleAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rememberMe = true;
    const tokenPair = await this.authService.generateTokenPairAndSave(
      req.user.id,
      req.user.accountHandle,
      req.user.roleType,
      rememberMe,
    );
    this.setAuthCookies(res, tokenPair, rememberMe);

    const redirectUrl = req.user.passwordHash
      ? this.buildFrontendRedirectUrl()
      : this.buildFrontendRedirectUrl(
          '/auth/setup-password',
          new URLSearchParams({ source: 'google' }),
        );

    return res.redirect(redirectUrl);
  }
}
