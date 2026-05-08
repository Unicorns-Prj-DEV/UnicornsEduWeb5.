jest.mock('resend', () => ({
  Resend: jest.fn(),
}));

import { ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';
import { MailService } from './mail.service';

const ResendMock = Resend as jest.MockedClass<typeof Resend>;

describe('MailService', () => {
  const sendMock = jest.fn();
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        RESEND_API_KEY: 're_test_key',
        MAIL_FROM: 'Unicorns Edu <no-reply@example.com>',
        FRONTEND_URL: 'https://app.example.com',
      };
      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ResendMock.mockImplementation(
      () =>
        ({
          emails: {
            send: sendMock,
          },
        }) as never,
    );
    sendMock.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  it('sends verification email through Resend with an idempotency key', async () => {
    const service = new MailService(configService as never);

    await service.sendVerificationEmail('user@example.com', 'verify-token');

    expect(ResendMock).toHaveBeenCalledWith('re_test_key');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Unicorns Edu <no-reply@example.com>',
        to: ['user@example.com'],
        subject: 'Xác thực email tài khoản',
        html: expect.stringContaining(
          'https://app.example.com/verify-email?token=verify-token',
        ),
      }),
      {
        idempotencyKey: expect.stringMatching(/^email-verify\/[a-f0-9]{32}$/),
      },
    );
  });

  it('fails fast when Resend is not configured', async () => {
    const service = new MailService({
      get: jest.fn((key: string) => {
        if (key === 'MAIL_FROM') {
          return 'Unicorns Edu <no-reply@example.com>';
        }
        if (key === 'FRONTEND_URL') {
          return 'https://app.example.com';
        }
        return undefined;
      }),
    } as never);

    await expect(
      service.sendForgotPasswordEmail('user@example.com', 'reset-token'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
