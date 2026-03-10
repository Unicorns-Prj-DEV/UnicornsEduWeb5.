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
import type {
  ForgotPasswordDto,
  ResetPasswordDto,
  UserAuthDto,
} from '../../dtos/user.dto';
import type { RefreshValidateResult } from './strategies/jwt-refresh.strategy';
import type { GoogleUserPayload } from './strategies/google.strategy';

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/admin',
  staff: '/mentor',
  student: '/student',
  guest: '/',
};

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
  async login(@Body() body: UserAuthDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request & { user: RefreshValidateResult }) {
    const { user } = req.user;
    const refreshToken = req.cookies?.refresh_token ?? '';
    return this.authService.refreshTokens(user.id, refreshToken);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
  async register(@Body() body: UserAuthDto) {
    return this.authService.register(body.email, body.password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return {
      message: 'Logged out successfully',
    };
  }
}
