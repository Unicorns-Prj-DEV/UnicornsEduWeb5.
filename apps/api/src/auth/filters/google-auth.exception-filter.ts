import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { REGISTRATION_DISABLED_CODE } from '../constants';

@Catch(ForbiddenException, UnauthorizedException)
export class GoogleAuthExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(
    exception: ForbiddenException | UnauthorizedException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (!request.path.includes('/auth/google')) {
      throw exception;
    }

    const frontendUrl = this.configService
      .getOrThrow<string>('FRONTEND_URL')
      .replace(/\/$/, '');
    const errorCode =
      exception.message === REGISTRATION_DISABLED_CODE
        ? 'registration_disabled'
        : 'google_auth_failed';

    response.redirect(`${frontendUrl}/auth/login?error=${errorCode}`);
  }
}
