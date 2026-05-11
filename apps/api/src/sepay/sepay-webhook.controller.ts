import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
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
import { createHash, timingSafeEqual } from 'crypto';
import { Public } from 'src/auth/decorators/public.decorator';
import { SePayWebhookDto } from './sepay-webhook.dto';
import { SePayWebhookService } from './sepay-webhook.service';

@ApiTags('webhooks')
@Controller('webhook/sepay')
export class SePayWebhookController {
  constructor(private readonly webhookService: SePayWebhookService) {}

  @Post()
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive SePay wallet top-up webhook',
    description:
      'Public SePay webhook receiver authenticated by X-Secret-Key. Successful duplicate, ignored, and reconciled deliveries all return a success acknowledgement.',
  })
  @ApiHeader({
    name: 'X-Secret-Key',
    required: true,
    description: 'Secret configured in SePay webhook settings.',
  })
  @ApiBody({ type: SePayWebhookDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook accepted by the receiver.',
    schema: {
      example: { status: 'success' },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid X-Secret-Key.' })
  @ApiResponse({
    status: 503,
    description: 'Webhook secret is not configured server-side.',
  })
  async receiveWebhook(
    @Headers('x-secret-key') secretHeader: string | string[] | undefined,
    @Body() payload: SePayWebhookDto,
  ): Promise<{ status: 'success' }> {
    this.assertValidSecret(secretHeader);
    await this.webhookService.reconcile(payload);
    return { status: 'success' };
  }

  private assertValidSecret(secretHeader: string | string[] | undefined): void {
    const expectedSecret = process.env.SEPAY_WEBHOOK_SECRET?.trim();
    if (!expectedSecret) {
      throw new ServiceUnavailableException(
        'SePay webhook secret is not configured.',
      );
    }

    const receivedSecret = Array.isArray(secretHeader)
      ? secretHeader[0]
      : secretHeader;
    if (!receivedSecret) {
      throw new UnauthorizedException('Invalid SePay webhook secret.');
    }

    const expectedHash = createHash('sha256').update(expectedSecret).digest();
    const receivedHash = createHash('sha256')
      .update(receivedSecret.trim())
      .digest();

    if (!timingSafeEqual(expectedHash, receivedHash)) {
      throw new UnauthorizedException('Invalid SePay webhook secret.');
    }
  }
}
