import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SePayWebhookDto } from './sepay-webhook.dto';

type SePayWebhookAction =
  | 'ignored_non_inbound'
  | 'duplicate'
  | 'unmatched'
  | 'amount_mismatch'
  | 'account_mismatch'
  | 'credited';

export interface SePayWebhookReconcileResult {
  action: SePayWebhookAction;
  orderCode?: string;
  walletTransactionId?: string;
}

type StudentWalletSepayOrderRecord = {
  orderCode: string;
  studentId: string;
  status: string;
  amountRequested?: number | null;
  amountReceived?: number | null;
  sepayTransactionId?: string | null;
  sepayReferenceCode?: string | null;
  walletTransactionId?: string | null;
  completedAt?: Date | null;
  receiptEmailSentAt?: Date | null;
  sepayAccountNumber?: string | null;
  parentEmail?: string | null;
  student?: {
    fullName?: string | null;
    parentEmail?: string | null;
  } | null;
};

type StudentWalletSepayOrderDelegate = {
  findFirst(args: unknown): Promise<StudentWalletSepayOrderRecord | null>;
  findUnique(args: unknown): Promise<StudentWalletSepayOrderRecord | null>;
  updateMany(args: unknown): Promise<{ count: number }>;
  update(args: unknown): Promise<StudentWalletSepayOrderRecord>;
};

type WalletTransactionsHistoryDelegate = {
  create(args: unknown): Promise<{ id: string }>;
};

type StudentInfoDelegate = {
  update(args: unknown): Promise<unknown>;
};

type SePayWebhookPrismaClient = {
  studentWalletSepayOrder: StudentWalletSepayOrderDelegate;
  walletTransactionsHistory: WalletTransactionsHistoryDelegate;
  studentInfo: StudentInfoDelegate;
};

@Injectable()
export class SePayWebhookService {
  private readonly logger = new Logger(SePayWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async reconcile(
    payload: SePayWebhookDto,
  ): Promise<SePayWebhookReconcileResult> {
    if (payload.transferType !== 'in') {
      return { action: 'ignored_non_inbound' };
    }

    const client = this.getPrismaClient(this.prisma);
    const duplicate = await this.findProcessedOrder(client, payload);
    if (duplicate) {
      return {
        action: 'duplicate',
        orderCode: duplicate.orderCode,
        walletTransactionId: duplicate.walletTransactionId ?? undefined,
      };
    }

    const order = await this.findMatchingOrder(client, payload);
    if (!order) {
      this.logger.warn(
        `SePay webhook unmatched: id=${payload.id} reference=${payload.referenceCode}`,
      );
      return { action: 'unmatched' };
    }

    if (this.isCompleted(order)) {
      return {
        action: 'duplicate',
        orderCode: order.orderCode,
        walletTransactionId: order.walletTransactionId ?? undefined,
      };
    }

    const preflightMismatch = this.getMismatchAction(order, payload);
    if (preflightMismatch) {
      this.logMismatch(preflightMismatch, order.orderCode, payload);
      return { action: preflightMismatch, orderCode: order.orderCode };
    }

    const result = await this.prisma.$transaction(async (transactionClient) => {
      const txClient = this.getPrismaClient(transactionClient);
      const txDuplicate = await this.findProcessedOrder(txClient, payload);
      if (txDuplicate) {
        return {
          action: 'duplicate' as const,
          order: txDuplicate,
          walletTransactionId: txDuplicate.walletTransactionId ?? undefined,
        };
      }

      const currentOrder = await txClient.studentWalletSepayOrder.findUnique({
        where: { orderCode: order.orderCode },
        include: { student: true },
      });
      if (!currentOrder) {
        return { action: 'unmatched' as const, order: null };
      }

      if (this.isCompleted(currentOrder)) {
        return {
          action: 'duplicate' as const,
          order: currentOrder,
          walletTransactionId: currentOrder.walletTransactionId ?? undefined,
        };
      }

      const mismatch = this.getMismatchAction(currentOrder, payload);
      if (mismatch) {
        return { action: mismatch, order: currentOrder };
      }

      const completedAt = new Date();
      const claimed = await txClient.studentWalletSepayOrder.updateMany({
        where: {
          orderCode: currentOrder.orderCode,
          status: 'pending',
          walletTransactionId: null,
        },
        data: {
          status: 'completed',
          amountReceived: payload.transferAmount,
          sepayTransactionId: String(payload.id),
          sepayReferenceCode: payload.referenceCode,
          completedAt,
          webhookPayload: this.buildStoredWebhookPayload(payload),
        },
      });

      if (claimed.count !== 1) {
        const afterClaim = await txClient.studentWalletSepayOrder.findUnique({
          where: { orderCode: currentOrder.orderCode },
          include: { student: true },
        });
        return {
          action: afterClaim ? ('duplicate' as const) : ('unmatched' as const),
          order: afterClaim,
          walletTransactionId: afterClaim?.walletTransactionId ?? undefined,
        };
      }

      const walletTransaction = await txClient.walletTransactionsHistory.create(
        {
          data: {
            studentId: currentOrder.studentId,
            type: 'topup',
            amount: payload.transferAmount,
            note: this.buildWalletTransactionNote(currentOrder, payload),
            date: this.parseTransactionDate(payload.transactionDate),
          },
        },
      );

      await txClient.studentInfo.update({
        where: { id: currentOrder.studentId },
        data: { accountBalance: { increment: payload.transferAmount } },
      });

      const completedOrder = await txClient.studentWalletSepayOrder.update({
        where: { orderCode: currentOrder.orderCode },
        data: { walletTransactionId: walletTransaction.id },
        include: { student: true },
      });

      return {
        action: 'credited' as const,
        order: completedOrder,
        walletTransactionId: walletTransaction.id,
      };
    });

    if (
      result.action === 'amount_mismatch' ||
      result.action === 'account_mismatch'
    ) {
      this.logMismatch(result.action, result.order?.orderCode, payload);
    }

    if (result.action === 'credited' && result.order) {
      await this.sendReceiptAfterCommit(result.order, payload);
      return {
        action: 'credited',
        orderCode: result.order.orderCode,
        walletTransactionId: result.walletTransactionId,
      };
    }

    return {
      action: result.action,
      orderCode: result.order?.orderCode,
      walletTransactionId: result.walletTransactionId,
    };
  }

  private getPrismaClient(client: unknown): SePayWebhookPrismaClient {
    const candidate = client as Partial<SePayWebhookPrismaClient>;
    if (!candidate.studentWalletSepayOrder) {
      throw new ServiceUnavailableException(
        'SePay wallet order storage is not available.',
      );
    }

    return candidate as SePayWebhookPrismaClient;
  }

  private async findProcessedOrder(
    client: SePayWebhookPrismaClient,
    payload: SePayWebhookDto,
  ): Promise<StudentWalletSepayOrderRecord | null> {
    return client.studentWalletSepayOrder.findFirst({
      where: {
        OR: [
          { sepayTransactionId: String(payload.id) },
          { sepayReferenceCode: payload.referenceCode },
        ],
      },
      include: { student: true },
    });
  }

  private async findMatchingOrder(
    client: SePayWebhookPrismaClient,
    payload: SePayWebhookDto,
  ): Promise<StudentWalletSepayOrderRecord | null> {
    for (const orderCode of this.getOrderCodeCandidates(payload)) {
      const order = await client.studentWalletSepayOrder.findUnique({
        where: { orderCode },
        include: { student: true },
      });
      if (order) {
        return order;
      }
    }

    return null;
  }

  private getOrderCodeCandidates(payload: SePayWebhookDto): string[] {
    const candidates: string[] = [];
    this.addOrderCodeCandidate(candidates, payload.code);

    const text = `${payload.content ?? ''} ${payload.description ?? ''}`;
    for (const match of text.match(/[A-Za-z0-9]{6,50}/g) ?? []) {
      this.addOrderCodeCandidate(candidates, match);
    }

    return candidates;
  }

  private addOrderCodeCandidate(
    candidates: string[],
    value: string | null,
  ): void {
    const trimmed = value?.trim();
    if (!trimmed) {
      return;
    }

    const variants = [trimmed, trimmed.toUpperCase()];
    for (const variant of variants) {
      if (!candidates.includes(variant)) {
        candidates.push(variant);
      }
    }
  }

  private isCompleted(order: StudentWalletSepayOrderRecord): boolean {
    return Boolean(order.walletTransactionId || order.status === 'completed');
  }

  private getMismatchAction(
    order: StudentWalletSepayOrderRecord,
    payload: SePayWebhookDto,
  ): 'amount_mismatch' | 'account_mismatch' | null {
    if (order.amountRequested !== payload.transferAmount) {
      return 'amount_mismatch';
    }

    const expectedAccountNumber = this.getExpectedAccountNumber(order);
    if (
      expectedAccountNumber &&
      this.normalizeAccountNumber(payload.accountNumber) !==
        expectedAccountNumber
    ) {
      return 'account_mismatch';
    }

    return null;
  }

  private getExpectedAccountNumber(
    order: StudentWalletSepayOrderRecord,
  ): string | null {
    return this.normalizeAccountNumber(order.sepayAccountNumber);
  }

  private normalizeAccountNumber(
    value: string | null | undefined,
  ): string | null {
    const normalized = value?.replace(/\s+/g, '').trim();
    return normalized ? normalized : null;
  }

  private buildStoredWebhookPayload(
    payload: SePayWebhookDto,
  ): Record<string, unknown> {
    return {
      id: payload.id,
      gateway: payload.gateway,
      transactionDate: payload.transactionDate,
      accountNumber: payload.accountNumber,
      code: payload.code,
      content: payload.content,
      transferType: payload.transferType,
      transferAmount: payload.transferAmount,
      accumulated: payload.accumulated,
      subAccount: payload.subAccount,
      referenceCode: payload.referenceCode,
      description: payload.description,
    };
  }

  private buildWalletTransactionNote(
    order: StudentWalletSepayOrderRecord,
    payload: SePayWebhookDto,
  ): string {
    return `SePay top-up ${order.orderCode} | Reference ${payload.referenceCode} | SePay ID ${payload.id}`;
  }

  private parseTransactionDate(value: string): Date {
    const parsed = new Date(value.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private async sendReceiptAfterCommit(
    order: StudentWalletSepayOrderRecord,
    payload: SePayWebhookDto,
  ): Promise<void> {
    const parentEmail = this.getParentEmail(order);
    if (!parentEmail) {
      return;
    }

    try {
      await this.mailService.sendStudentWalletTopUpReceiptEmail({
        to: parentEmail,
        studentName: order.student?.fullName ?? 'Học sinh',
        orderCode: order.orderCode,
        amountReceived: payload.transferAmount,
        transactionDate: payload.transactionDate,
        referenceCode: payload.referenceCode,
      });

      const client = this.getPrismaClient(this.prisma);
      await client.studentWalletSepayOrder.update({
        where: { orderCode: order.orderCode },
        data: { receiptEmailSentAt: new Date() },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown receipt mail failure';
      this.logger.warn(
        `SePay receipt email failed for order=${order.orderCode}: ${message}`,
      );
    }
  }

  private getParentEmail(order: StudentWalletSepayOrderRecord): string | null {
    const parentEmail = order.parentEmail ?? order.student?.parentEmail;
    const trimmed = parentEmail?.trim();
    return trimmed ? trimmed : null;
  }

  private logMismatch(
    action: 'amount_mismatch' | 'account_mismatch',
    orderCode: string | undefined,
    payload: SePayWebhookDto,
  ): void {
    this.logger.warn(
      `SePay webhook ${action}: order=${orderCode ?? 'unknown'} id=${payload.id} reference=${payload.referenceCode}`,
    );
  }
}
