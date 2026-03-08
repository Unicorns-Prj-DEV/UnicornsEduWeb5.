import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser, type JwtPayload } from './decorators/current-user.decorator';
import type { UserAuthDto } from '../../dtos/user.dto';
import type { RefreshValidateResult } from './strategies/jwt-refresh.strategy';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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
}
