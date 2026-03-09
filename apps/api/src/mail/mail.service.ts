import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly transporter: Transporter | null;
    private readonly mailFrom: string;
    private readonly backendUrl: string;

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
        this.mailFrom = this.configService.get<string>('MAIL_FROM') ?? 'no-reply@localhost';
        this.backendUrl = this.configService.get<string>('BACKEND_URL') ?? 'http://localhost:3001';
    }

    async sendVerificationEmail(email: string, token: string): Promise<void> {
        if (!this.transporter) {
            return; // Mail not configured (e.g. dev without SMTP)
        }
        const verificationLink = `${this.backendUrl}/auth/verify?token=${encodeURIComponent(token)}`;

        await this.transporter.sendMail({
            from: this.mailFrom,
            to: email,
            subject: 'Xác thực email tài khoản',
            text: `Vui lòng xác thực email của bạn qua liên kết sau: ${verificationLink}`,
            html: `<p>Vui lòng xác thực email của bạn bằng cách bấm vào liên kết sau:</p><p><a href="${verificationLink}">${verificationLink}</a></p>`,
        });
    }
}
