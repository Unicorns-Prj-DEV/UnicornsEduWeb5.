import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly transporter: Transporter | null;
    private readonly mailFrom: string;

    constructor(private readonly configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        if (host) {
            const smtpSecure = this.configService.get<string>('SMTP_SECURE') === 'true';
            this.transporter = nodemailer.createTransport({
                host,
                port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
                secure: smtpSecure,
                auth: {
                    user: this.configService.get<string>('SMTP_USER'),
                    pass: this.configService.get<string>('SMTP_PASS'),
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
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
        const verificationLink = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

        await this.transporter.sendMail({
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
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
        const forgotPasswordLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

        await this.transporter.sendMail({
            from: this.mailFrom,
            to: email,
            subject: 'Khôi phục mật khẩu',
            text: `Vui lòng khôi phục mật khẩu của bạn qua liên kết sau: ${forgotPasswordLink}`,
            html: `<p>Vui lòng khôi phục mật khẩu của bạn bằng cách bấm vào liên kết sau:</p><p><a href="${forgotPasswordLink}">Link</a></p>`,
        });
    }
}
