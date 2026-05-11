jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

import { ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service';

describe('MailService', () => {
  const sendMail = jest.fn();
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '587',
        SMTP_USER: 'sender@gmail.com',
        SMTP_PASS: 'app-password',
        SMTP_SECURE: 'false',
        MAIL_FROM: 'Unicorns Edu <sender@gmail.com>',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('reports SMTP authentication failures as service unavailable', async () => {
    sendMail.mockRejectedValueOnce(
      Object.assign(new Error('Invalid login'), {
        code: 'EAUTH',
        responseCode: 535,
      }),
    );
    const service = new MailService(configService as never);

    await expect(
      service.sendVerificationEmail('user@example.com', 'token'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('removes Gmail app password grouping spaces before creating the transport', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '587',
        SMTP_USER: 'sender@gmail.com',
        SMTP_PASS: 'abcd efgh ijkl mnop',
        SMTP_SECURE: 'false',
        MAIL_FROM: 'Unicorns Edu <sender@gmail.com>',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return values[key];
    });

    new MailService(configService as never);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: {
          user: 'sender@gmail.com',
          pass: 'abcdefghijklmnop',
        },
      }),
    );
  });

  it('sends a wallet top-up receipt to the exact parent email', async () => {
    sendMail.mockResolvedValueOnce(undefined);
    const service = new MailService(configService as never);

    await service.sendStudentWalletTopUpReceiptEmail({
      to: 'parent@example.com',
      parentName: 'Phụ huynh A',
      studentName: 'Nguyễn Minh',
      amountReceived: 150000,
      orderCode: 'UEDU-20260511-001',
      transactionDate: '2026-05-11 09:30:00',
      referenceCode: 'FT26069ABC',
      balanceAfter: 450000,
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Unicorns Edu <sender@gmail.com>',
        to: 'parent@example.com',
        subject: expect.stringContaining('UEDU-20260511-001'),
        text: expect.stringContaining('Nguyễn Minh'),
        html: expect.stringContaining('Nguyễn Minh'),
      }),
    );
    const sent = sendMail.mock.calls[0][0];
    expect(sent.text).toContain('150.000');
    expect(sent.text).toContain('UEDU-20260511-001');
    expect(sent.text).toContain('FT26069ABC');
    expect(sent.html).toContain('150.000');
    expect(sent.html).toContain('UEDU-20260511-001');
  });

  it('escapes risky HTML content in wallet top-up receipts', async () => {
    sendMail.mockResolvedValueOnce(undefined);
    const service = new MailService(configService as never);

    await service.sendStudentWalletTopUpReceiptEmail({
      to: 'parent@example.com',
      parentName: '<img src=x onerror=alert(1)>',
      studentName: 'An <script>alert(1)</script>',
      amountReceived: 1000,
      orderCode: 'ORD-<script>alert(1)</script>',
      referenceCode: '<b>REF</b>',
    });

    const sent = sendMail.mock.calls[0][0];
    expect(sent.html).not.toContain('<script>');
    expect(sent.html).not.toContain('<img');
    expect(sent.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(sent.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(sent.html).toContain('&lt;script&gt;');
    expect(sent.html).toContain('&lt;b&gt;REF&lt;/b&gt;');
  });

  it('maps receipt SMTP authentication failures as service unavailable', async () => {
    sendMail.mockRejectedValueOnce(
      Object.assign(new Error('Invalid login'), {
        code: 'EAUTH',
        responseCode: 535,
      }),
    );
    const service = new MailService(configService as never);

    await expect(
      service.sendStudentWalletTopUpReceiptEmail({
        to: 'parent@example.com',
        studentName: 'Nguyễn Minh',
        amountReceived: 150000,
        orderCode: 'UEDU-20260511-001',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
