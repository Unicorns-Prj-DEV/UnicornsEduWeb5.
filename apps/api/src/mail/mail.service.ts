import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Resend, type ErrorResponse } from 'resend';

type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

@Injectable()
export class MailService {
  private readonly resend: Resend | null;
  private readonly mailFrom: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.mailFrom =
      this.configService.get<string>('MAIL_FROM') ?? 'no-reply@localhost';
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.sendEmail({
      to: email,
      subject: 'Xác thực email tài khoản',
      text: `Vui lòng xác thực email của bạn qua liên kết sau: ${verificationLink}`,
      html: `<p>Vui lòng xác thực email của bạn bằng cách bấm vào liên kết sau:</p><p><a href="${verificationLink}">${verificationLink}</a></p>`,
      idempotencyKey: this.buildIdempotencyKey('email-verify', token),
    });
  }

  async sendForgotPasswordEmail(email: string, token: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const forgotPasswordLink = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await this.sendEmail({
      to: email,
      subject: 'Khôi phục mật khẩu',
      text: `Vui lòng khôi phục mật khẩu của bạn qua liên kết sau: ${forgotPasswordLink}`,
      html: `<p>Vui lòng khôi phục mật khẩu của bạn bằng cách bấm vào liên kết sau:</p><p><a href="${forgotPasswordLink}">Link</a></p>`,
      idempotencyKey: this.buildIdempotencyKey('forgot-password', token),
    });
  }

  private async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.resend) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình gửi email (Resend). Vui lòng cấu hình RESEND_API_KEY trong .env hoặc liên hệ quản trị viên.',
      );
    }

    const maxAttempts = 3;
    let lastError: ErrorResponse | unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { error } = await this.resend.emails.send(
          {
            from: this.mailFrom,
            to: [options.to],
            subject: options.subject,
            text: options.text,
            html: options.html,
          },
          { idempotencyKey: options.idempotencyKey },
        );

        if (!error) {
          return;
        }

        lastError = error;
        if (!this.shouldRetry(error) || attempt === maxAttempts) {
          break;
        }
      } catch (error) {
        lastError = error;
        if (
          !this.isResendError(error) ||
          !this.shouldRetry(error) ||
          attempt === maxAttempts
        ) {
          break;
        }
      }

      await this.delay(2 ** (attempt - 1) * 1000);
    }

    throw new ServiceUnavailableException(
      this.formatSendErrorMessage(lastError),
    );
  }

  private buildIdempotencyKey(type: string, token: string): string {
    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex')
      .slice(0, 32);
    return `${type}/${tokenHash}`;
  }

  private shouldRetry(error: ErrorResponse): boolean {
    return error.statusCode === 429 || error.statusCode === 500;
  }

  private formatSendErrorMessage(error: ErrorResponse | unknown): string {
    if (this.isResendError(error)) {
      return `Không gửi được email qua Resend: ${error.message}`;
    }

    return 'Không gửi được email qua Resend.';
  }

  private isResendError(error: unknown): error is ErrorResponse {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
