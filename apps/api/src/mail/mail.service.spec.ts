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
});
