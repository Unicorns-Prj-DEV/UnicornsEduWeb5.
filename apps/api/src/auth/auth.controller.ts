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
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import {
  CurrentUser,
  type JwtPayload,
} from './decorators/current-user.decorator';
import {
  CreateUserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UserAuthDto,
} from '../dtos/user.dto';
import type { RefreshValidateResult } from './strategies/jwt-refresh.strategy';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: Request & { user: GoogleUserPayload },
    @Res() res: Response,
  ) {
    const user = req.user;
    if (!user?.id || !user?.email) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=google_no_user`);
    }
    const tokens = await this.authService.generateTokenPairAndSave(
      user.id,
      user.email,
      user.roleType,
    );
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const redirectPath = ROLE_REDIRECT[user.roleType] ?? '/';
    const hash = `access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}`;
    return res.redirect(`${frontendUrl}/auth/google/callback#${hash}`);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate with email and password. Returns access token and sets refresh token in cookie.',
  })
  @ApiBody({
    type: UserAuthDto,
    description: 'Email, password, and optional rememberMe',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken and refreshToken.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() body: UserAuthDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(body.email, body.password, body.rememberMe);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: this.authService.accessTokenExpiresIn * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: this.authService.refreshTokenDefaultExpiresIn * 1000,
    });

    return { message: 'Login successful' };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
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
  async refresh(@CurrentUser() user: JwtPayload, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    console.log(user)

    const oldRefreshToken = req.cookies?.refresh_token ?? '';
    const { accessToken, refreshToken } = await this.authService.refreshTokens(user.user.id, oldRefreshToken);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: this.authService.accessTokenExpiresIn * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: this.authService.refreshTokenDefaultExpiresIn * 1000,
    });

    return { message: 'Refresh successful' };
  }

  @Get('profile')
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Get profile',
    description:
      'Returns the current user profile from JWT payload. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile (id, email, role, etc.).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
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
  async register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('verify')
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
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Request a password reset link sent to the given email.',
  })
  @ApiBody({ type: ForgotPasswordDto, description: 'Email address' })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists.',
  })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password',
    description: 'Set new password using the token from forgot-password email.',
  })
  @ApiBody({ type: ResetPasswordDto, description: 'Token and new password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
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
  getMe(@CurrentUser() user: JwtPayload) {
    return user;
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
}
