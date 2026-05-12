import type { SePayWebhookDto } from './sepay-webhook.dto';
import { SePayWebhookService } from './sepay-webhook.service';

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

function createPrismaMock() {
  const tx = {
    studentWalletSepayOrder: {
      findFirst: jest.fn<Promise<unknown>, [unknown]>(),
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
      updateMany: jest.fn<Promise<{ count: number }>, [unknown]>(),
      update: jest.fn<Promise<unknown>, [unknown]>(),
    },
    walletTransactionsHistory: {
      create: jest.fn<Promise<{ id: string }>, [unknown]>(),
    },
    studentInfo: {
      update: jest.fn<Promise<unknown>, [unknown]>(),
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
    },
  };

  return {
    ...tx,
    $transaction: jest.fn(
      async <T>(
        callback: (transactionClient: typeof tx) => Promise<T>,
      ): Promise<T> => callback(tx),
    ),
  };
}

type ObjectArg = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

describe('SePayWebhookService', () => {
  it('acknowledges non-inbound events without touching wallet data', async () => {
    const prisma = createPrismaMock();
    const mail = { sendStudentWalletTopUpReceiptEmail: jest.fn() };
    const service = new SePayWebhookService(prisma as never, mail as never);

    await expect(
      service.reconcile(buildPayload({ transferType: 'out' })),
    ).resolves.toEqual({ action: 'ignored_non_inbound' });

    expect(prisma.studentWalletSepayOrder.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mail.sendStudentWalletTopUpReceiptEmail).not.toHaveBeenCalled();
  });

  it('credits a matching pending order exactly once in one transaction and sends a receipt after commit', async () => {
    const prisma = createPrismaMock();
    const mail = { sendStudentWalletTopUpReceiptEmail: jest.fn() };
    const pendingOrder = {
      orderCode: 'UABCDEF1234567890',
      studentId: 'student-1',
      status: 'pending',
      amountRequested: 120_000,
      amountReceived: null,
      transferNote: 'NAPVI UABCDEF1234567890',
      sepayTransactionId: null,
      sepayReferenceCode: null,
      walletTransactionId: null,
      receiptEmailSentAt: null,
      accountNumber: '0123499999',
      student: {
        fullName: 'Nguyen Van A',
        parentName: 'Nguyen Thi B',
        parentEmail: 'parent@example.com',
      },
    };
    const completedOrder = {
      ...pendingOrder,
      status: 'completed',
      amountReceived: 120_000,
      sepayTransactionId: '92704',
      sepayReferenceCode: 'MBVCB.3278907687',
      walletTransactionId: 'wallet-tx-1',
      completedAt: new Date('2026-05-11T02:15:00.000Z'),
    };

    prisma.studentWalletSepayOrder.findFirst.mockResolvedValue(null);
    prisma.studentWalletSepayOrder.findUnique.mockResolvedValue(pendingOrder);
    prisma.studentWalletSepayOrder.updateMany.mockResolvedValue({ count: 1 });
    prisma.walletTransactionsHistory.create.mockResolvedValue({
      id: 'wallet-tx-1',
    });
    prisma.studentWalletSepayOrder.update
      .mockResolvedValueOnce(completedOrder)
      .mockResolvedValueOnce({
        ...completedOrder,
        receiptEmailSentAt: new Date(),
      });
    prisma.studentInfo.update.mockResolvedValue({ id: 'student-1' });
    prisma.studentInfo.findUnique.mockResolvedValue({
      accountBalance: 1_320_000,
    });

    const service = new SePayWebhookService(prisma as never, mail as never);

    await expect(service.reconcile(buildPayload())).resolves.toEqual({
      action: 'credited',
      orderCode: 'UABCDEF1234567890',
      walletTransactionId: 'wallet-tx-1',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const updateManyArg = prisma.studentWalletSepayOrder.updateMany.mock
      .calls[0]?.[0] as ObjectArg | undefined;
    expect(updateManyArg?.where).toEqual({
      orderCode: 'UABCDEF1234567890',
      status: 'pending',
      walletTransactionId: null,
    });
    expect(updateManyArg?.data).toMatchObject({
      status: 'completed',
      amountReceived: 120_000,
      sepayTransactionId: '92704',
      sepayReferenceCode: 'MBVCB.3278907687',
    });

    const walletCreateArg = prisma.walletTransactionsHistory.create.mock
      .calls[0]?.[0] as ObjectArg | undefined;
    expect(walletCreateArg?.data).toMatchObject({
      studentId: 'student-1',
      type: 'topup',
      amount: 120_000,
    });
    expect(prisma.studentInfo.update).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      data: { accountBalance: { increment: 120_000 } },
    });
    expect(mail.sendStudentWalletTopUpReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'parent@example.com',
        parentName: 'Nguyen Thi B',
        studentCode: 'student-1',
        orderCode: 'UABCDEF1234567890',
        amountReceived: 120_000,
        referenceCode: 'MBVCB.3278907687',
        transferNote: 'NAPVI UABCDEF1234567890',
        balanceAfter: 1_320_000,
      }),
    );
  });

  it('does not create a second wallet transaction for duplicate SePay id/reference deliveries', async () => {
    const prisma = createPrismaMock();
    const mail = { sendStudentWalletTopUpReceiptEmail: jest.fn() };
    prisma.studentWalletSepayOrder.findFirst.mockResolvedValue({
      orderCode: 'UABCDEF1234567890',
      status: 'completed',
      walletTransactionId: 'wallet-tx-1',
      sepayTransactionId: '92704',
      sepayReferenceCode: 'MBVCB.3278907687',
    });
    const service = new SePayWebhookService(prisma as never, mail as never);

    await expect(service.reconcile(buildPayload())).resolves.toEqual({
      action: 'duplicate',
      orderCode: 'UABCDEF1234567890',
      walletTransactionId: 'wallet-tx-1',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.walletTransactionsHistory.create).not.toHaveBeenCalled();
    expect(mail.sendStudentWalletTopUpReceiptEmail).not.toHaveBeenCalled();
  });

  it('ignores unmatched and amount-mismatched inbound events without crediting', async () => {
    const prisma = createPrismaMock();
    const mail = { sendStudentWalletTopUpReceiptEmail: jest.fn() };
    const service = new SePayWebhookService(prisma as never, mail as never);

    prisma.studentWalletSepayOrder.findFirst.mockResolvedValue(null);
    prisma.studentWalletSepayOrder.findUnique.mockResolvedValue(null);
    await expect(service.reconcile(buildPayload())).resolves.toEqual({
      action: 'unmatched',
    });

    prisma.studentWalletSepayOrder.findUnique.mockResolvedValue({
      orderCode: 'UABCDEF1234567890',
      studentId: 'student-1',
      status: 'pending',
      amountRequested: 150_000,
      walletTransactionId: null,
    });
    await expect(service.reconcile(buildPayload())).resolves.toEqual({
      action: 'amount_mismatch',
      orderCode: 'UABCDEF1234567890',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.walletTransactionsHistory.create).not.toHaveBeenCalled();
    expect(mail.sendStudentWalletTopUpReceiptEmail).not.toHaveBeenCalled();
  });
});
