import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Public } from 'src/auth/decorators/public.decorator';
import { SePayWebhookDto } from './sepay-webhook.dto';
import { SePayWebhookService } from './sepay-webhook.service';

type HeaderValue = string | string[] | undefined;
type RawBodyRequestLike = {
  rawBody?: Buffer | string;
};
type SePayWebhookAuthLogContext = {
  expectedSecret?: string;
  signature?: string;
  secretHeader?: string;
  expectedSignature?: string;
};

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300;

@ApiTags('webhooks')
@Controller('webhook/sepay')
export class SePayWebhookController {
  private readonly logger = new Logger(SePayWebhookController.name);

  constructor(private readonly webhookService: SePayWebhookService) {}

  @Post()
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive SePay wallet top-up webhook',
    description:
      'Public SePay webhook receiver authenticated by X-SePay-Signature HMAC headers. Legacy X-Secret-Key can be enabled during rollout. Successful duplicate, ignored, and reconciled deliveries all return a success acknowledgement.',
  })
  @ApiHeader({
    name: 'X-SePay-Signature',
    required: false,
    description:
      'HMAC SHA-256 signature: sha256=<hex>, signed over "{timestamp}.{raw_body}".',
  })
  @ApiHeader({
    name: 'X-SePay-Timestamp',
    required: false,
    description: 'Unix timestamp used in the SePay signature string.',
  })
  @ApiHeader({
    name: 'X-Secret-Key',
    required: false,
    description:
      'Legacy secret header accepted only when SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY=1.',
  })
  @ApiBody({ type: SePayWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook accepted by the receiver.',
    schema: {
      example: { success: true },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid SePay signature/secret.' })
  @ApiResponse({
    status: 503,
    description: 'Webhook secret is not configured server-side.',
  })
  async receiveWebhook(
    @Headers('x-secret-key') secretHeader: HeaderValue,
    @Headers('x-sepay-signature') signatureHeader: HeaderValue,
    @Headers('x-sepay-timestamp') timestampHeader: HeaderValue,
    @Body() payload: SePayWebhookDto,
    @Req() request?: RawBodyRequestLike,
  ): Promise<{ success: true }> {
    this.assertValidAuthentication({
      secretHeader,
      signatureHeader,
      timestampHeader,
      request,
      payload,
    });
    await this.webhookService.reconcile(payload);
    return { success: true };
  }

  private assertValidAuthentication(params: {
    secretHeader: HeaderValue;
    signatureHeader: HeaderValue;
    timestampHeader: HeaderValue;
    request: RawBodyRequestLike | undefined;
    payload: SePayWebhookDto;
  }): void {
    const expectedSecret = process.env.SEPAY_WEBHOOK_SECRET?.trim();
    const signature = this.getSingleHeader(params.signatureHeader);
    const timestamp = this.getSingleHeader(params.timestampHeader);
    const secretHeader = this.getSingleHeader(params.secretHeader);
    if (!expectedSecret) {
      this.logInvalidWebhookAuthentication('missing_webhook_secret', {
        expectedSecret,
        signature,
        secretHeader,
      });
      throw new ServiceUnavailableException(
        'SePay webhook secret is not configured.',
      );
    }

    if (signature || timestamp) {
      this.assertValidSignature({
        expectedSecret,
        signature,
        timestamp,
        request: params.request,
        payload: params.payload,
        secretHeader,
      });
      return;
    }

    if (!this.isLegacySecretFallbackEnabled()) {
      this.logInvalidWebhookAuthentication('missing_hmac_headers', {
        expectedSecret,
        signature,
        secretHeader,
      });
      throw new UnauthorizedException('Invalid SePay webhook signature.');
    }

    this.assertValidLegacySecret(secretHeader, expectedSecret, {
      expectedSecret,
      signature,
      secretHeader,
    });
  }

  private assertValidSignature(params: {
    expectedSecret: string;
    signature: string | undefined;
    timestamp: string | undefined;
    request: RawBodyRequestLike | undefined;
    payload: SePayWebhookDto;
    secretHeader: string | undefined;
  }): void {
    if (!params.signature || !params.timestamp) {
      this.logInvalidWebhookAuthentication('incomplete_hmac_headers', {
        expectedSecret: params.expectedSecret,
        signature: params.signature,
        secretHeader: params.secretHeader,
      });
      throw new UnauthorizedException('Invalid SePay webhook signature.');
    }

    const normalizedTimestamp = params.timestamp.trim();
    if (!/^\d+$/.test(normalizedTimestamp)) {
      this.logInvalidWebhookAuthentication('malformed_timestamp', {
        expectedSecret: params.expectedSecret,
        signature: params.signature,
        secretHeader: params.secretHeader,
      });
      throw new UnauthorizedException('Invalid SePay webhook signature.');
    }

    const normalizedSignature = params.signature.trim().toLowerCase();
    if (!/^sha256=[a-f0-9]{64}$/i.test(normalizedSignature)) {
      this.logInvalidWebhookAuthentication('malformed_signature', {
        expectedSecret: params.expectedSecret,
        signature: params.signature,
        secretHeader: params.secretHeader,
      });
      throw new UnauthorizedException('Invalid SePay webhook signature.');
    }

    this.assertSignatureTimestampFresh(normalizedTimestamp, {
      expectedSecret: params.expectedSecret,
      signature: normalizedSignature,
      secretHeader: params.secretHeader,
    });

    const rawBodyBuffer = this.getRawBodyBuffer(params.request);
    if (!rawBodyBuffer) {
      this.logInvalidWebhookAuthentication('missing_raw_body', {
        expectedSecret: params.expectedSecret,
        signature: normalizedSignature,
        secretHeader: params.secretHeader,
      });
      throw new ServiceUnavailableException(
        'SePay webhook raw body is not available.',
      );
    }

    const expectedSignature = this.buildExpectedSignature(
      params.expectedSecret,
      normalizedTimestamp,
      rawBodyBuffer,
    );

    if (
      !this.safeEqualSha256HexDigest(normalizedSignature, expectedSignature)
    ) {
      this.logInvalidWebhookAuthentication('signature_mismatch', {
        expectedSecret: params.expectedSecret,
        signature: normalizedSignature,
        secretHeader: params.secretHeader,
        expectedSignature,
      });
      throw new UnauthorizedException('Invalid SePay webhook signature.');
    }
  }

  private assertSignatureTimestampFresh(
    timestamp: string,
    context: SePayWebhookAuthLogContext,
  ): void {
    const toleranceSeconds = this.getSignatureToleranceSeconds();
    if (toleranceSeconds === null) {
      return;
    }

    const signedAtSeconds = Number.parseInt(timestamp, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const driftSeconds = nowSeconds - signedAtSeconds;
    if (Math.abs(driftSeconds) > toleranceSeconds) {
      this.logInvalidWebhookAuthentication('timestamp_outside_tolerance', {
        ...context,
      });
      throw new UnauthorizedException(
        `SePay webhook timestamp is outside the allowed drift (${toleranceSeconds}s). ` +
          'Replay the request with a fresh X-SePay-Timestamp and matching X-SePay-Signature, ' +
          'or adjust SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS on non-production environments.',
      );
    }
  }

  private getSignatureToleranceSeconds(): number | null {
    const raw = process.env.SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS?.trim();
    if (raw === '0') {
      return null;
    }

    if (!raw) {
      return DEFAULT_SIGNATURE_TOLERANCE_SECONDS;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_SIGNATURE_TOLERANCE_SECONDS;
  }

  private assertValidLegacySecret(
    secretHeader: string | undefined,
    expectedSecret: string,
    context: SePayWebhookAuthLogContext,
  ): void {
    const receivedSecret = secretHeader;
    if (!receivedSecret) {
      this.logInvalidWebhookAuthentication('missing_legacy_secret_header', {
        ...context,
        secretHeader: receivedSecret,
      });
      throw new UnauthorizedException('Invalid SePay webhook secret.');
    }

    if (!this.safeEqual(receivedSecret.trim(), expectedSecret)) {
      this.logInvalidWebhookAuthentication('legacy_secret_mismatch', {
        ...context,
        secretHeader: receivedSecret,
      });
      throw new UnauthorizedException('Invalid SePay webhook secret.');
    }
  }

  /** SePay: `sha256=` + HMAC-SHA256(secret, UTF-8 `{timestamp}.` + exact raw body bytes). */
  private buildExpectedSignature(
    secret: string,
    timestamp: string,
    rawBody: Buffer,
  ): string {
    const prefix = Buffer.from(`${timestamp}.`, 'utf8');
    return (
      'sha256=' +
      createHmac('sha256', secret).update(prefix).update(rawBody).digest('hex')
    );
  }

  private getRawBodyBuffer(
    request: RawBodyRequestLike | undefined,
  ): Buffer | null {
    if (Buffer.isBuffer(request?.rawBody)) {
      return request.rawBody;
    }

    if (typeof request?.rawBody === 'string') {
      return Buffer.from(request.rawBody, 'utf8');
    }

    return null;
  }

  /** Constant-time compare of the 32-byte SHA-256 digests (hex under `sha256=`). */
  private safeEqualSha256HexDigest(
    receivedSha256Header: string,
    expectedSha256Header: string,
  ): boolean {
    const received = receivedSha256Header.trim().toLowerCase();
    const expected = expectedSha256Header.trim().toLowerCase();
    if (
      !received.startsWith('sha256=') ||
      !expected.startsWith('sha256=') ||
      received.length !== expected.length
    ) {
      return false;
    }
    const receivedHex = received.slice('sha256='.length);
    const expectedHex = expected.slice('sha256='.length);
    if (
      !/^[a-f0-9]{64}$/.test(receivedHex) ||
      !/^[a-f0-9]{64}$/.test(expectedHex)
    ) {
      return false;
    }
    const a = Buffer.from(receivedHex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private getSingleHeader(value: HeaderValue): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private isLegacySecretFallbackEnabled(): boolean {
    const value =
      process.env.SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY?.trim().toLowerCase();
    return value === '1' || value === 'true';
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private logInvalidWebhookAuthentication(
    reason: string,
    context: SePayWebhookAuthLogContext,
  ): void {
    this.logger.warn(
      `[SePayWebhookAuth] invalid ${JSON.stringify({
        reason,
        expectedSecret: this.maskValue(context.expectedSecret),
        receivedLegacySecret: this.maskValue(context.secretHeader),
        receivedSignature: this.maskValue(context.signature),
        expectedSignature: context.expectedSignature ?? null,
        expectedSecretSha256: this.hashSecret(context.expectedSecret),
        receivedLegacySecretSha256: this.hashSecret(context.secretHeader),
        expectedSecretLength: context.expectedSecret?.trim().length ?? 0,
        receivedLegacySecretLength: context.secretHeader?.trim().length ?? 0,
        receivedSignatureLength: context.signature?.trim().length ?? 0,
      })}`,
    );
  }

  private hashSecret(value: string | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    return createHash('sha256').update(normalized).digest('hex');
  }

  private maskValue(value: string | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    if (normalized.length <= 16) {
      return `${normalized.slice(0, 4)}...${normalized.length}`;
    }

    return `${normalized.slice(0, 12)}...${normalized.slice(-8)}`;
  }
}
