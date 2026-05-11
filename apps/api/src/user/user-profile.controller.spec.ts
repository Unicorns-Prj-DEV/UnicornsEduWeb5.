import { ServiceUnavailableException } from '@nestjs/common';
import { UserRole } from 'generated/enums';
import { SePayDuplicateOrderCodeException } from 'src/sepay/sepay.service';
import { UserProfileController } from './user-profile.controller';

describe('UserProfileController', () => {
  const userService = {
    getLinkedStudentId: jest.fn(),
  };
  const studentService = {
    getTuitionExtensionTransferNoteForSelf: jest.fn(),
  };
  const sePayService = {
    isWalletTopUpConfigured: jest.fn(),
    buildStudentWalletOrderCode: jest.fn(),
    createStudentWalletTopUpPayment: jest.fn(),
  };
  const prisma = {
    studentInfo: {
      findUnique: jest.fn(),
    },
    studentWalletSepayOrder: {
      create: jest.fn(),
    },
  };

  let controller: UserProfileController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UserProfileController(
      userService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      studentService as never,
      {} as never,
      sePayService as never,
      prisma as never,
    );
  });

  it('rejects SePay top-up initiation when SePay is not configured', async () => {
    sePayService.isWalletTopUpConfigured.mockReturnValue(false);

    await expect(
      controller.createMyStudentSePayTopUpOrder(
        {
          id: 'user-1',
          email: 'student@example.com',
          accountHandle: 'student',
          roleType: UserRole.student,
        },
        { amount: 500000 },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(userService.getLinkedStudentId).not.toHaveBeenCalled();
  });

  it('creates SePay order, persists pending order metadata, and returns the persisted contract', async () => {
    sePayService.isWalletTopUpConfigured.mockReturnValue(true);
    userService.getLinkedStudentId.mockResolvedValue('student-1');
    studentService.getTuitionExtensionTransferNoteForSelf.mockResolvedValue(
      'Gia hạn gói học phí',
    );
    prisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      parentEmail: 'parent@example.com',
    });
    sePayService.buildStudentWalletOrderCode.mockReturnValue('ABC123');
    sePayService.createStudentWalletTopUpPayment.mockResolvedValue({
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
      transferNote: 'Gia hạn gói học phí ABC123',
      raw: { status: 'success' },
    });
    prisma.studentWalletSepayOrder.create.mockResolvedValue({
      id: 'order-row-1',
      studentId: 'student-1',
      orderCode: 'ABC123',
      status: 'pending',
      amountRequested: 500000,
      amountReceived: null,
      transferNote: 'Gia hạn gói học phí ABC123',
      parentEmail: 'parent@example.com',
      sepayOrderId: 'sepay-order-1',
      sepayOrderStatus: 'Pending',
      sepayVaNumber: '963NQDABC123',
      sepayVaHolderName: 'UNICORNS EDU',
      sepayBankName: 'BIDV',
      sepayAccountNumber: '1234567890',
      sepayAccountHolderName: 'UNICORNS EDU',
      sepayQrCode: 'data:image/png;base64,abc',
      sepayQrCodeUrl: 'https://qr.sepay.vn/img?template=compact',
      sepayExpiredAt: new Date('2026-05-11T10:15:00.000Z'),
      createdAt: new Date('2026-05-11T09:00:00.000Z'),
      updatedAt: new Date('2026-05-11T09:00:00.000Z'),
    });

    await expect(
      controller.createMyStudentSePayTopUpOrder(
        {
          id: 'user-1',
          email: 'student@example.com',
          accountHandle: 'student',
          roleType: UserRole.student,
        },
        { amount: 500000 },
      ),
    ).resolves.toMatchObject({
      id: 'order-row-1',
      amount: 500000,
      amountRequested: 500000,
      amountReceived: null,
      status: 'pending',
      transferNote: 'Gia hạn gói học phí ABC123',
      parentEmail: 'parent@example.com',
      orderCode: 'ABC123',
      orderId: 'sepay-order-1',
      vaNumber: '963NQDABC123',
      vaHolderName: 'UNICORNS EDU',
      bankName: 'BIDV',
      accountNumber: '1234567890',
      accountHolderName: 'UNICORNS EDU',
      qrCode: 'data:image/png;base64,abc',
      qrCodeUrl: 'https://qr.sepay.vn/img?template=compact',
      expiredAt: '2026-05-11T10:15:00.000Z',
    });

    expect(sePayService.createStudentWalletTopUpPayment).toHaveBeenCalledWith({
      amountVnd: 500000,
      orderCode: 'ABC123',
      baseTransferNote: 'Gia hạn gói học phí',
    });
    expect(prisma.studentWalletSepayOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: 'student-1',
        orderCode: 'ABC123',
        amountRequested: 500000,
        transferNote: 'Gia hạn gói học phí ABC123',
        parentEmail: 'parent@example.com',
        sepayOrderId: 'sepay-order-1',
        sepayOrderStatus: 'Pending',
        sepayVaNumber: '963NQDABC123',
        sepayVaHolderName: 'UNICORNS EDU',
      }),
    });
  });

  it('retries with a fresh order code when SePay reports a duplicate order_code', async () => {
    sePayService.isWalletTopUpConfigured.mockReturnValue(true);
    userService.getLinkedStudentId.mockResolvedValue('student-1');
    studentService.getTuitionExtensionTransferNoteForSelf.mockResolvedValue(
      'Gia hạn gói học phí',
    );
    prisma.studentInfo.findUnique.mockResolvedValue({
      id: 'student-1',
      parentEmail: null,
    });
    sePayService.buildStudentWalletOrderCode
      .mockReturnValueOnce('ABC123')
      .mockReturnValueOnce('DEF456');
    sePayService.createStudentWalletTopUpPayment
      .mockRejectedValueOnce(new SePayDuplicateOrderCodeException())
      .mockResolvedValueOnce({
        orderId: 'sepay-order-2',
        orderCode: 'DEF456',
        amount: 500000,
        sepayStatus: 'Pending',
        vaNumber: '963NQDDEF456',
        vaHolderName: null,
        bankName: 'BIDV',
        accountNumber: '1234567890',
        accountHolderName: 'UNICORNS EDU',
        expiredAt: null,
        qrCode: null,
        qrCodeUrl: 'https://qr.sepay.vn/img?template=compact',
        transferNote: 'Gia hạn gói học phí DEF456',
        raw: { status: 'success' },
      });
    prisma.studentWalletSepayOrder.create.mockResolvedValue({
      id: 'order-row-2',
      studentId: 'student-1',
      orderCode: 'DEF456',
      status: 'pending',
      amountRequested: 500000,
      amountReceived: null,
      transferNote: 'Gia hạn gói học phí DEF456',
      parentEmail: null,
      sepayOrderId: 'sepay-order-2',
      sepayOrderStatus: 'Pending',
      sepayVaNumber: '963NQDDEF456',
      sepayVaHolderName: null,
      sepayBankName: 'BIDV',
      sepayAccountNumber: '1234567890',
      sepayAccountHolderName: 'UNICORNS EDU',
      sepayQrCode: null,
      sepayQrCodeUrl: 'https://qr.sepay.vn/img?template=compact',
      sepayExpiredAt: null,
      createdAt: new Date('2026-05-11T09:00:00.000Z'),
      updatedAt: new Date('2026-05-11T09:00:00.000Z'),
    });

    await expect(
      controller.createMyStudentSePayTopUpOrder(
        {
          id: 'user-1',
          email: 'student@example.com',
          accountHandle: 'student',
          roleType: UserRole.student,
        },
        { amount: 500000 },
      ),
    ).resolves.toMatchObject({
      id: 'order-row-2',
      orderCode: 'DEF456',
      transferNote: 'Gia hạn gói học phí DEF456',
    });

    expect(sePayService.createStudentWalletTopUpPayment).toHaveBeenCalledTimes(
      2,
    );
    expect(
      sePayService.createStudentWalletTopUpPayment,
    ).toHaveBeenNthCalledWith(1, {
      amountVnd: 500000,
      orderCode: 'ABC123',
      baseTransferNote: 'Gia hạn gói học phí',
    });
    expect(
      sePayService.createStudentWalletTopUpPayment,
    ).toHaveBeenNthCalledWith(2, {
      amountVnd: 500000,
      orderCode: 'DEF456',
      baseTransferNote: 'Gia hạn gói học phí',
    });
    expect(prisma.studentWalletSepayOrder.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderCode: 'DEF456',
        transferNote: 'Gia hạn gói học phí DEF456',
      }),
    });
  });
});
