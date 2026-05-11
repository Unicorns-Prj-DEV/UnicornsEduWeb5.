import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { firstValueFrom } from 'rxjs';
import type { SePayNormalizedCreateOrderResult } from './sepay.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class SePayDuplicateOrderCodeException extends ConflictException {
  constructor(message = 'SePay order_code already exists.') {
    super(message);
  }
}

@Injectable()
export class SePayService {
  private readonly logger = new Logger(SePayService.name);

  constructor(private readonly http: HttpService) {}

  isWalletTopUpConfigured(): boolean {
    return Boolean(
      process.env.SEPAY_API_ACCESS_TOKEN?.trim() &&
      process.env.SEPAY_BANK_ACCOUNT_XID?.trim(),
    );
  }

  /**
   * Mã đơn alphanumeric 6–50 ký tự (ràng buộc SePay).
   */
  buildStudentWalletOrderCode(studentId: string): string {
    const hex = randomBytes(4).toString('hex').toUpperCase();
    const compact = studentId.replace(/-/g, '').slice(0, 10);
    const code = `U${compact}${hex}`;
    return code.slice(0, 50);
  }

  async createBankAccountOrder(params: {
    amountVnd: number;
    orderCode: string;
    description?: string;
    qrcodeTemplate?: 'compact' | 'qronly';
  }): Promise<SePayNormalizedCreateOrderResult> {
    const base =
      process.env.SEPAY_USERAPI_BASE_URL?.trim() || 'https://userapi.sepay.vn';
    const token = process.env.SEPAY_API_ACCESS_TOKEN?.trim();
    const baXid = process.env.SEPAY_BANK_ACCOUNT_XID?.trim();
    if (!token || !baXid) {
      throw new ServiceUnavailableException(
        'SePay chưa được cấu hình (thiếu SEPAY_API_ACCESS_TOKEN hoặc SEPAY_BANK_ACCOUNT_XID).',
      );
    }
    this.assertCreateOrderInput(params.amountVnd, params.orderCode);

    const url = `${base.replace(/\/$/, '')}/v2/bank-accounts/${encodeURIComponent(baXid)}/orders`;

    const body: Record<string, string | number> = {
      order_code: params.orderCode,
      amount: params.amountVnd,
      with_qrcode: 1,
      qrcode_template: params.qrcodeTemplate ?? 'compact',
    };
    const description = params.description?.trim();
    if (description) {
      body.description = description;
    }

    const vaPrefix = process.env.SEPAY_VA_PREFIX?.trim();
    if (vaPrefix) {
      body.va_prefix = vaPrefix;
    }

    const durationRaw = process.env.SEPAY_ORDER_DURATION_SECONDS?.trim();
    const duration = durationRaw ? Number.parseInt(durationRaw, 10) : 900;
    if (Number.isFinite(duration) && duration > 0) {
      body.duration = duration;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(url, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 45_000,
        }),
      );
      return this.normalizeCreateOrderResponse(response.data);
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };
      const status = err.response?.status;
      const data = err.response?.data;
      this.logger.warn(
        `SePay create order failed: status=${status} data=${JSON.stringify(data)?.slice(0, 500)}`,
      );
      const message = this.extractSePayErrorMessage(data) ?? err.message;
      if (status === 409) {
        throw new SePayDuplicateOrderCodeException(
          message ?? 'SePay order_code already exists.',
        );
      }
      throw new BadGatewayException(
        message ??
          'Không tạo được đơn SePay. Vui lòng thử lại hoặc liên hệ trung tâm.',
      );
    }
  }

  private extractSePayErrorMessage(data: unknown): string | undefined {
    if (!isRecord(data)) {
      return undefined;
    }
    const msg = data.message ?? data.error;
    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim();
    }
    const nested = data.data;
    if (isRecord(nested) && typeof nested.message === 'string') {
      return nested.message.trim();
    }
    return undefined;
  }

  private assertCreateOrderInput(amountVnd: number, orderCode: string) {
    if (!Number.isInteger(amountVnd) || amountVnd <= 0) {
      throw new BadRequestException(
        'SePay order amount must be a positive integer.',
      );
    }

    if (!/^[A-Za-z0-9]{6,50}$/.test(orderCode)) {
      throw new BadRequestException(
        'SePay order_code must be 6-50 alphanumeric characters.',
      );
    }
  }

  private normalizeCreateOrderResponse(
    data: unknown,
  ): SePayNormalizedCreateOrderResult {
    const raw = data;
    let payload: Record<string, unknown> | null = null;

    if (isRecord(data) && data.status === 'success' && isRecord(data.data)) {
      payload = data.data;
    } else if (isRecord(data)) {
      payload = data;
    }

    if (!payload) {
      return { raw };
    }

    const qrCode =
      typeof payload.qr_code === 'string' ? payload.qr_code : undefined;
    const qrCodeUrl =
      typeof payload.qr_code_url === 'string' ? payload.qr_code_url : undefined;

    return {
      orderId:
        typeof payload.id === 'string'
          ? payload.id
          : typeof payload.order_id === 'string'
            ? payload.order_id
            : null,
      orderCode:
        typeof payload.order_code === 'string' ? payload.order_code : null,
      amount: typeof payload.amount === 'number' ? payload.amount : null,
      sepayStatus: typeof payload.status === 'string' ? payload.status : null,
      vaNumber:
        typeof payload.va_number === 'string' ? payload.va_number : null,
      vaHolderName:
        typeof payload.va_holder_name === 'string'
          ? payload.va_holder_name
          : null,
      bankName:
        typeof payload.bank_name === 'string' ? payload.bank_name : null,
      accountNumber:
        typeof payload.account_number === 'string'
          ? payload.account_number
          : null,
      accountHolderName:
        typeof payload.account_holder_name === 'string'
          ? payload.account_holder_name
          : null,
      expiredAt:
        typeof payload.expired_at === 'string'
          ? payload.expired_at
          : payload.expired_at === null
            ? null
            : null,
      qrCode: qrCode ?? null,
      qrCodeUrl: qrCodeUrl ?? null,
      raw,
    };
  }
}
