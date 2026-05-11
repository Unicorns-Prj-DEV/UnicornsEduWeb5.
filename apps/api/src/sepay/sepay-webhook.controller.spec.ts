import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SePayWebhookController } from './sepay-webhook.controller';
import type { SePayWebhookDto } from './sepay-webhook.dto';
import type { SePayWebhookService } from './sepay-webhook.service';

function buildPayload(
  overrides: Partial<SePayWebhookDto> = {},
): SePayWebhookDto {
  return {
    id: 92704,
    gateway: 'Vietcombank',
    transactionDate: '2026-05-11 09:15:00',
    accountNumber: '0123499999',
    code: 'UABCDEF1234567890',
    content: 'NAP VI UABCDEF1234567890',
    transferType: 'in',
    transferAmount: 120_000,
    accumulated: 1_200_000,
    subAccount: null,
    referenceCode: 'MBVCB.3278907687',
    description: 'NAP VI UABCDEF1234567890',
    ...overrides,
  };
}

describe('SePayWebhookController', () => {
  const originalSecret = process.env.SEPAY_WEBHOOK_SECRET;
  let service: Pick<SePayWebhookService, 'reconcile'>;
  let controller: SePayWebhookController;

  beforeEach(() => {
    process.env.SEPAY_WEBHOOK_SECRET = 'test-secret';
    service = {
      reconcile: jest.fn().mockResolvedValue({ action: 'credited' }),
    } as Pick<SePayWebhookService, 'reconcile'>;
    controller = new SePayWebhookController(service as SePayWebhookService);
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.SEPAY_WEBHOOK_SECRET;
    } else {
      process.env.SEPAY_WEBHOOK_SECRET = originalSecret;
    }
  });

  it('fails closed when the webhook secret is not configured', async () => {
    delete process.env.SEPAY_WEBHOOK_SECRET;

    await expect(
      controller.receiveWebhook('test-secret', buildPayload()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('rejects missing or invalid X-Secret-Key headers', async () => {
    await expect(
      controller.receiveWebhook(undefined, buildPayload()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.receiveWebhook('wrong-secret', buildPayload()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('acknowledges valid webhook deliveries with status success', async () => {
    await expect(
      controller.receiveWebhook('test-secret', buildPayload()),
    ).resolves.toEqual({ status: 'success' });
    expect(service.reconcile).toHaveBeenCalledWith(buildPayload());
  });
});
