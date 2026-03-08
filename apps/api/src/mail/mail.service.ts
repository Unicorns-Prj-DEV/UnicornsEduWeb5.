import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly transporter: Transporter;
    private readonly mailFrom: string;
    private readonly backendUrl: string;

    constructor(private readonly configService: ConfigService) {
        const smtpSecure = this.configService.getOrThrow<string>('SMTP_SECURE') === 'true';
        this.transporter = nodemailer.createTransport({
            host: this.configService.getOrThrow<string>('SMTP_HOST'),
            port: Number(this.configService.getOrThrow<string>('SMTP_PORT')),
            secure: smtpSecure,
            auth: {
                user: this.configService.getOrThrow<string>('SMTP_USER'),
                pass: this.configService.getOrThrow<string>('SMTP_PASS'),
            },
        });
        this.mailFrom = this.configService.getOrThrow<string>('MAIL_FROM');
        this.backendUrl = this.configService.getOrThrow<string>('BACKEND_URL');
    }

    async sendVerificationEmail(email: string, token: string): Promise<void> {
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
