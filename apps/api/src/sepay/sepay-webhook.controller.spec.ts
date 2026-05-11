import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
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

function currentUnixTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

function signRawBody(
  rawBody: string,
  timestamp = currentUnixTimestamp(),
  secret = 'test-secret',
) {
  return (
    'sha256=' +
    createHmac('sha256', secret)
      .update(Buffer.from(`${timestamp}.`, 'utf8'))
      .update(Buffer.from(rawBody, 'utf8'))
      .digest('hex')
  );
}

function buildSignedHeaders(payload: SePayWebhookDto, rawBody?: string) {
  const timestamp = currentUnixTimestamp();
  const requestBody = rawBody ?? JSON.stringify(payload);
  const signature = signRawBody(requestBody, timestamp);
  return {
    signature,
    timestamp,
    request: { rawBody: Buffer.from(requestBody) },
  };
}

describe('SePayWebhookController', () => {
  const originalSecret = process.env.SEPAY_WEBHOOK_SECRET;
  const originalLegacyFallback =
    process.env.SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY;
  const originalSignatureTolerance =
    process.env.SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS;
  let service: Pick<SePayWebhookService, 'reconcile'>;
  let controller: SePayWebhookController;

  beforeEach(() => {
    process.env.SEPAY_WEBHOOK_SECRET = 'test-secret';
    delete process.env.SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY;
    delete process.env.SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS;
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
    if (originalLegacyFallback === undefined) {
      delete process.env.SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY;
    } else {
      process.env.SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY =
        originalLegacyFallback;
    }
    if (originalSignatureTolerance === undefined) {
      delete process.env.SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS;
    } else {
      process.env.SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS =
        originalSignatureTolerance;
    }
  });

  it('fails closed when the webhook secret is not configured', async () => {
    delete process.env.SEPAY_WEBHOOK_SECRET;

    await expect(
      controller.receiveWebhook(
        'test-secret',
        undefined,
        undefined,
        buildPayload(),
        {},
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('rejects missing or invalid SePay authentication headers', async () => {
    await expect(
      controller.receiveWebhook(
        undefined,
        undefined,
        undefined,
        buildPayload(),
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      controller.receiveWebhook(
        'wrong-secret',
        undefined,
        undefined,
        buildPayload(),
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('acknowledges valid HMAC signed webhook deliveries with status success', async () => {
    const payload = buildPayload();
    const { signature, timestamp, request } = buildSignedHeaders(payload);

    await expect(
      controller.receiveWebhook(
        undefined,
        signature,
        timestamp,
        payload,
        request,
      ),
    ).resolves.toEqual({ success: true });
    expect(service.reconcile).toHaveBeenCalledWith(payload);
  });

  it('rejects HMAC signatures generated with a different secret', async () => {
    const payload = buildPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = currentUnixTimestamp();
    const signature = signRawBody(rawBody, timestamp, 'wrong-secret');

    await expect(
      controller.receiveWebhook(undefined, signature, timestamp, payload, {
        rawBody: Buffer.from(rawBody),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('verifies HMAC signatures against the exact raw body sent by SePay', async () => {
    const payload = buildPayload();
    const rawBody = JSON.stringify(payload, null, 2);
    const { signature, timestamp, request } = buildSignedHeaders(
      payload,
      rawBody,
    );

    await expect(
      controller.receiveWebhook(
        undefined,
        signature,
        timestamp,
        payload,
        request,
      ),
    ).resolves.toEqual({ success: true });
    expect(service.reconcile).toHaveBeenCalledWith(payload);
  });

  it('does not fall back to JSON.stringify(payload) when raw body differs', async () => {
    const payload = buildPayload();
    const rawBody = JSON.stringify(payload, null, 2);
    const timestamp = currentUnixTimestamp();
    const signature = signRawBody(JSON.stringify(payload), timestamp);

    await expect(
      controller.receiveWebhook(undefined, signature, timestamp, payload, {
        rawBody: Buffer.from(rawBody),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('rejects HMAC signatures generated from a different JSON payload', async () => {
    const payload = buildPayload();
    const differentPayload = JSON.stringify({
      transferAmount: payload.transferAmount,
      content: payload.content,
      accountNumber: payload.accountNumber,
      transferType: payload.transferType,
    });
    const timestamp = currentUnixTimestamp();
    const signature = signRawBody(differentPayload, timestamp);

    await expect(
      controller.receiveWebhook(undefined, signature, timestamp, payload, {
        rawBody: Buffer.from(JSON.stringify(payload)),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('fails closed when HMAC headers are present but raw body is unavailable', async () => {
    const payload = buildPayload();
    const { signature, timestamp } = buildSignedHeaders(payload);

    await expect(
      controller.receiveWebhook(undefined, signature, timestamp, payload, {}),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('rejects incomplete or malformed HMAC signature headers', async () => {
    const payload = buildPayload();
    const { signature, timestamp } = buildSignedHeaders(payload);

    await expect(
      controller.receiveWebhook(undefined, signature, undefined, payload),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const malformedSignatures = [
      undefined,
      '',
      'not-sha256',
      'sha1=' + 'a'.repeat(64),
      'sha256=',
      'sha256=not-hex',
      'sha256=' + 'a'.repeat(63),
    ];
    for (const malformedSignature of malformedSignatures) {
      await expect(
        controller.receiveWebhook(
          undefined,
          malformedSignature,
          timestamp,
          payload,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    await expect(
      controller.receiveWebhook(
        undefined,
        signature,
        'not-a-timestamp',
        payload,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('rejects HMAC signatures outside the configured timestamp tolerance', async () => {
    const payload = buildPayload();
    const rawBody = JSON.stringify(payload);
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 301);
    const signature = signRawBody(rawBody, staleTimestamp);

    await expect(
      controller.receiveWebhook(undefined, signature, staleTimestamp, payload, {
        rawBody: Buffer.from(rawBody),
      }),
    ).rejects.toThrow(/outside the allowed drift/);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('rejects HMAC signatures from the future outside the configured timestamp tolerance', async () => {
    const payload = buildPayload();
    const rawBody = JSON.stringify(payload);
    const futureTimestamp = String(Math.floor(Date.now() / 1000) + 301);
    const signature = signRawBody(rawBody, futureTimestamp);

    await expect(
      controller.receiveWebhook(
        undefined,
        signature,
        futureTimestamp,
        payload,
        { rawBody: Buffer.from(rawBody) },
      ),
    ).rejects.toThrow(/outside the allowed drift/);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('lets configured signature tolerance disable replay-window checks for SePay smoke tests', async () => {
    process.env.SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = '0';
    const payload = buildPayload();
    const rawBody = JSON.stringify(payload);
    const timestamp = '1778488061';
    const signature = signRawBody(rawBody, timestamp);

    await expect(
      controller.receiveWebhook(undefined, signature, timestamp, payload, {
        rawBody: Buffer.from(rawBody),
      }),
    ).resolves.toEqual({ success: true });
    expect(service.reconcile).toHaveBeenCalledWith(payload);
  });

  it('rejects legacy X-Secret-Key deliveries unless fallback is explicitly enabled', async () => {
    await expect(
      controller.receiveWebhook(
        'test-secret',
        undefined,
        undefined,
        buildPayload(),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('rejects invalid HMAC even when a valid legacy X-Secret-Key is present', async () => {
    process.env.SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY = '1';
    const payload = buildPayload();
    const { timestamp } = buildSignedHeaders(payload);

    await expect(
      controller.receiveWebhook(
        'test-secret',
        'sha256=' + 'a'.repeat(64),
        timestamp,
        payload,
        { rawBody: Buffer.from(JSON.stringify(payload)) },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('accepts valid HMAC even when legacy X-Secret-Key is wrong', async () => {
    const payload = buildPayload();
    const { signature, timestamp, request } = buildSignedHeaders(payload);

    await expect(
      controller.receiveWebhook(
        'wrong-secret',
        signature,
        timestamp,
        payload,
        request,
      ),
    ).resolves.toEqual({ success: true });
    expect(service.reconcile).toHaveBeenCalledWith(payload);
  });

  it('accepts uppercase HMAC signature headers', async () => {
    const payload = buildPayload();
    const { signature, timestamp, request } = buildSignedHeaders(payload);

    await expect(
      controller.receiveWebhook(
        undefined,
        signature.toUpperCase(),
        timestamp,
        payload,
        request,
      ),
    ).resolves.toEqual({ success: true });
    expect(service.reconcile).toHaveBeenCalledWith(payload);
  });

  it('keeps accepting legacy X-Secret-Key deliveries while SePay signature rollout is in progress', async () => {
    process.env.SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY = '1';

    await expect(
      controller.receiveWebhook(
        'test-secret',
        undefined,
        undefined,
        buildPayload(),
      ),
    ).resolves.toEqual({ success: true });
    expect(service.reconcile).toHaveBeenCalledWith(buildPayload());
  });

  it.each(['credited', 'duplicate', 'unmatched', 'ignored_non_inbound'])(
    'always returns only success acknowledgement when reconcile action is %s',
    async (action) => {
      service.reconcile = jest.fn().mockResolvedValue({ action });
      controller = new SePayWebhookController(service as SePayWebhookService);
      const payload = buildPayload();
      const { signature, timestamp, request } = buildSignedHeaders(payload);

      await expect(
        controller.receiveWebhook(
          undefined,
          signature,
          timestamp,
          payload,
          request,
        ),
      ).resolves.toEqual({ success: true });
    },
  );

  it('rejects invalid HMAC signatures', async () => {
    const payload = buildPayload();
    const { timestamp } = buildSignedHeaders(payload);

    await expect(
      controller.receiveWebhook(undefined, 'sha256=bad', timestamp, payload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.reconcile).not.toHaveBeenCalled();
  });
});
