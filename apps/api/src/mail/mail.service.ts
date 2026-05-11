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

export interface StudentWalletTopUpReceiptEmailParams {
  to: string;
  parentName?: string | null;
  studentName: string;
  amountReceived: number;
  orderCode: string;
  transactionDate?: string | null;
  referenceCode?: string | null;
  balanceAfter?: number | null;
}

interface StudentWalletTopUpReceiptEmailWebhookPayload {
  parentEmail: string;
  studentName: string | null;
  orderCode: string;
  amountVnd: number;
  transactionDate?: string | null;
  referenceCode?: string | null;
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

  async sendStudentWalletTopUpReceiptEmail(
    params: StudentWalletTopUpReceiptEmailParams,
  ): Promise<void>;
  async sendStudentWalletTopUpReceiptEmail(
    params: StudentWalletTopUpReceiptEmailWebhookPayload,
  ): Promise<void>;
  async sendStudentWalletTopUpReceiptEmail(
    params:
      | StudentWalletTopUpReceiptEmailParams
      | StudentWalletTopUpReceiptEmailWebhookPayload,
  ): Promise<void> {
    const to = 'to' in params ? params.to : params.parentEmail;
    const amount =
      'amountReceived' in params ? params.amountReceived : params.amountVnd;
    const parentName = this.normalizeReceiptText(
      'parentName' in params ? params.parentName : null,
    );
    const studentName =
      this.normalizeReceiptText(params.studentName) || 'Học sinh';
    const orderCode = this.normalizeReceiptText(params.orderCode);
    const transactionDate = this.normalizeReceiptText(params.transactionDate);
    const referenceCode = this.normalizeReceiptText(params.referenceCode);
    const amountReceived = this.formatVnd(amount);
    const balanceAfter =
      'balanceAfter' in params && params.balanceAfter != null
        ? this.formatVnd(params.balanceAfter)
        : null;

    const details = [
      ['Học sinh', studentName],
      ['Số tiền đã nhận', amountReceived],
      ['Mã đơn SePay', orderCode],
      transactionDate ? ['Thời gian giao dịch', transactionDate] : null,
      referenceCode ? ['Mã tham chiếu ngân hàng', referenceCode] : null,
      balanceAfter ? ['Số dư sau nạp', balanceAfter] : null,
    ].filter((item): item is [string, string] => Boolean(item));

    const greeting = parentName
      ? `Xin chào ${parentName},`
      : 'Xin chào Quý phụ huynh,';
    const textDetails = details
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n');
    const htmlRows = details
      .map(
        ([label, value]) => `<tr>
          <th align="left" style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;color:#374151;font-weight:600;">${this.escapeHtml(label)}</th>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#111827;">${this.escapeHtml(value)}</td>
        </tr>`,
      )
      .join('');

    await this.sendMailOrThrow({
      from: this.mailFrom,
      to,
      subject: `Biên nhận nạp ví Unicorns Edu - ${orderCode}`,
      text: `${greeting}

Unicorns Edu đã ghi nhận khoản nạp ví học sinh qua SePay.

${textDetails}

Số dư ví được cập nhật tự động sau khi ngân hàng xác nhận giao dịch.

Trân trọng,
Unicorns Edu`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <p>${this.escapeHtml(greeting)}</p>
        <p>Unicorns Edu đã ghi nhận khoản nạp ví học sinh qua SePay.</p>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">${htmlRows}</table>
        <p>Số dư ví được cập nhật tự động sau khi ngân hàng xác nhận giao dịch.</p>
        <p>Trân trọng,<br/>Unicorns Edu</p>
      </div>`,
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

  private normalizeReceiptText(value: string | null | undefined): string {
    return (value ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatVnd(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
