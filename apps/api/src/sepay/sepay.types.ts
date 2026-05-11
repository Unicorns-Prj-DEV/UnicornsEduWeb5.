export type SePayWalletTopUpMode = 'va_order' | 'bank_transfer';

/** Phản hồi chuẩn hoá sau khi tạo đơn SePay (userapi v2 bank-accounts/.../orders). */
export interface SePayNormalizedCreateOrderResult {
  orderId?: string | null;
  orderCode?: string | null;
  amount?: number | null;
  sepayStatus?: string | null;
  vaNumber?: string | null;
  vaHolderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  expiredAt?: string | null;
  /** data:image/png;base64,... hoặc URL tuyệt đối */
  qrCode?: string | null;
  qrCodeUrl?: string | null;
  raw?: unknown;
}

export interface SePayWalletTopUpPaymentResult extends SePayNormalizedCreateOrderResult {
  transferNote: string;
}
