import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import {
  SePayDuplicateOrderCodeException,
  SePayService,
} from './sepay.service';

describe('SePayService', () => {
  const http = {
    post: jest.fn(),
  };

  let service: SePayService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SEPAY_API_ACCESS_TOKEN: 'token-123',
      SEPAY_BANK_ACCOUNT_XID: 'bank-xid-123',
      SEPAY_USERAPI_BASE_URL: 'https://userapi.test',
      SEPAY_ORDER_DURATION_SECONDS: '900',
    };
    service = new SePayService(http as never);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a bank account order using the UserAPI v2 QR payload contract', async () => {
    http.post.mockReturnValue(
      of({
        data: {
          status: 'success',
          data: {
            id: 'sepay-order-1',
            order_code: 'ABC123',
            amount: 500000,
            status: 'Pending',
            va_number: '963NQDABC123',
            va_holder_name: 'UNICORNS EDU',
            bank_name: 'BIDV',
            account_number: '1234567890',
            account_holder_name: 'UNICORNS EDU',
            expired_at: '2026-05-11 10:15:00',
            qr_code: 'data:image/png;base64,abc',
            qr_code_url: 'https://qr.sepay.vn/img?template=compact',
          },
        },
      }),
    );

    await expect(
      service.createBankAccountOrder({
        amountVnd: 500000,
        orderCode: 'ABC123',
        description: 'Nap vi ABC123',
      }),
    ).resolves.toMatchObject({
      orderId: 'sepay-order-1',
      orderCode: 'ABC123',
      amount: 500000,
      sepayStatus: 'Pending',
      vaNumber: '963NQDABC123',
      vaHolderName: 'UNICORNS EDU',
      bankName: 'BIDV',
      accountNumber: '1234567890',
      accountHolderName: 'UNICORNS EDU',
      expiredAt: '2026-05-11 10:15:00',
      qrCode: 'data:image/png;base64,abc',
      qrCodeUrl: 'https://qr.sepay.vn/img?template=compact',
    });

    expect(http.post).toHaveBeenCalledWith(
      'https://userapi.test/v2/bank-accounts/bank-xid-123/orders',
      {
        order_code: 'ABC123',
        amount: 500000,
        with_qrcode: 1,
        qrcode_template: 'compact',
        description: 'Nap vi ABC123',
        duration: 900,
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('rejects invalid order codes before calling SePay', async () => {
    await expect(
      service.createBankAccountOrder({
        amountVnd: 500000,
        orderCode: 'bad code',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(http.post).not.toHaveBeenCalled();
  });

  it('signals duplicate SePay order codes from 409 responses', async () => {
    http.post.mockReturnValue(
      throwError(() => ({
        response: {
          status: 409,
          data: { message: 'duplicate order_code' },
        },
      })),
    );

    await expect(
      service.createBankAccountOrder({
        amountVnd: 500000,
        orderCode: 'ABC123',
      }),
    ).rejects.toBeInstanceOf(SePayDuplicateOrderCodeException);
  });
});
