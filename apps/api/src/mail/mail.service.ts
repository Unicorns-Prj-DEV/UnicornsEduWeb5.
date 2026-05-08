import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';

interface SmtpError {
  code?: string;
  responseCode?: number;
  command?: string;
  message?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly mailFrom: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      const smtpSecure =
        this.configService.get<string>('SMTP_SECURE') === 'true';
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
        secure: smtpSecure,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.getSmtpPassword(host),
        },
      });
    } else {
      this.transporter = null;
    }
    this.mailFrom =
      this.configService.get<string>('MAIL_FROM') ?? 'no-reply@localhost';
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình gửi email (SMTP). Vui lòng cấu hình SMTP trong .env hoặc liên hệ quản trị viên.',
      );
    }
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await this.sendMailOrThrow({
      from: this.mailFrom,
      to: email,
      subject: 'Xác thực email tài khoản',
      text: `Vui lòng xác thực email của bạn qua liên kết sau: ${verificationLink}`,
      html: `<p>Vui lòng xác thực email của bạn bằng cách bấm vào liên kết sau:</p><p><a href="${verificationLink}">${verificationLink}</a></p>`,
    });
  }

  async sendForgotPasswordEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình gửi email (SMTP). Vui lòng cấu hình SMTP trong .env hoặc liên hệ quản trị viên.',
      );
    }
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const forgotPasswordLink = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await this.sendMailOrThrow({
      from: this.mailFrom,
      to: email,
      subject: 'Khôi phục mật khẩu',
      text: `Vui lòng khôi phục mật khẩu của bạn qua liên kết sau: ${forgotPasswordLink}`,
      html: `<p>Vui lòng khôi phục mật khẩu của bạn bằng cách bấm vào liên kết sau:</p><p><a href="${forgotPasswordLink}">Link</a></p>`,
    });
  }

  private async sendMailOrThrow(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình gửi email (SMTP). Vui lòng cấu hình SMTP trong .env hoặc liên hệ quản trị viên.',
      );
    }

    try {
      await this.transporter.sendMail(options);
    } catch (error) {
      throw this.buildSmtpException(error);
    }
  }

  private buildSmtpException(error: unknown): ServiceUnavailableException {
    const smtpError = error as SmtpError;
    this.logger.warn(
      `SMTP send failed: code=${smtpError.code ?? 'unknown'} responseCode=${smtpError.responseCode ?? 'unknown'} command=${smtpError.command ?? 'unknown'}`,
    );

    if (smtpError.code === 'EAUTH' || smtpError.responseCode === 535) {
      return new ServiceUnavailableException(
        'Đăng nhập SMTP thất bại. Vui lòng kiểm tra SMTP_USER và SMTP_PASS trong apps/api/.env; nếu dùng Gmail, SMTP_PASS phải là App Password 16 ký tự.',
      );
    }

    if (
      smtpError.code === 'ECONNECTION' ||
      smtpError.code === 'ESOCKET' ||
      smtpError.code === 'ETIMEDOUT' ||
      smtpError.code === 'ECONNREFUSED'
    ) {
      return new ServiceUnavailableException(
        'Không kết nối được máy chủ SMTP. Vui lòng kiểm tra SMTP_HOST, SMTP_PORT, SMTP_SECURE và kết nối mạng.',
      );
    }

    return new ServiceUnavailableException(
      'Không gửi được email qua SMTP. Vui lòng kiểm tra cấu hình SMTP hoặc liên hệ quản trị viên.',
    );
  }

  private getSmtpPassword(host: string): string | undefined {
    const password = this.configService.get<string>('SMTP_PASS');
    if (!password) {
      return password;
    }

    const compactPassword = password.replace(/\s/g, '');
    if (
      host.toLowerCase().includes('gmail.com') &&
      compactPassword.length === 16
    ) {
      return compactPassword;
    }

    return password;
  }
}
