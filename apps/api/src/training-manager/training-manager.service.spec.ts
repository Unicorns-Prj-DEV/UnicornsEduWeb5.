jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  PaymentStatus,
  StaffRole,
  StaffStatus,
  UserRole,
} from '../../generated/enums';
import { TrainingManagerService } from './training-manager.service';

describe('TrainingManagerService', () => {
  const mockPrisma = {
    staffInfo: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    class: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const mockActionHistory = {
    recordUpdate: jest.fn(),
  };

  let service: TrainingManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TrainingManagerService(
      mockPrisma as never,
      mockActionHistory as never,
    );
  });

  describe('getSessionAllowancesByClass', () => {
    const staffId = 'staff-training-1';
    const classId = 'class-1';
    const monthKey = '2026-07';

    it('returns session allowances for a managed class in month', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: classId,
        trainingManagerStaffId: staffId,
      });
      mockPrisma.session.findMany.mockResolvedValue([
        {
          id: 'session-1',
          date: new Date('2026-07-15T00:00:00.000Z'),
          trainingManagerRatePercent: 5,
          trainingManagerAllowanceAmount: 34714,
          trainingManagerPaymentStatus: PaymentStatus.pending,
          attendance: [{ tuitionFee: 500_000 }, { tuitionFee: 194_280 }],
        },
      ]);

      const result = await service.getSessionAllowancesByClass(
        'admin-user',
        UserRole.admin,
        staffId,
        classId,
        monthKey,
      );

      expect(result).toEqual([
        {
          sessionId: 'session-1',
          date: new Date('2026-07-15T00:00:00.000Z').toISOString(),
          sessionTuitionTotal: 694_280,
          trainingManagerRatePercent: 5,
          allowanceAmount: 34714,
          paymentStatus: PaymentStatus.pending,
        },
      ]);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classId,
            trainingManagerStaffId: staffId,
          }),
          select: expect.objectContaining({
            attendance: expect.objectContaining({
              where: {
                status: {
                  in: [AttendanceStatus.present, AttendanceStatus.excused],
                },
              },
            }),
          }),
        }),
      );
    });

    it('throws when class is not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.getSessionAllowancesByClass(
          'admin-user',
          UserRole.admin,
          staffId,
          classId,
          monthKey,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when class is not managed by staff', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: classId,
        trainingManagerStaffId: 'other-staff',
      });

      await expect(
        service.getSessionAllowancesByClass(
          'admin-user',
          UserRole.admin,
          staffId,
          classId,
          monthKey,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateClassTrainingManager', () => {
    const classId = 'class-1';
    const adminActor = {
      userId: 'admin-user',
      userEmail: 'admin@edu.vn',
      roleType: UserRole.admin,
    };
    const updatedClass = {
      id: classId,
      trainingManagerStaffId: 'staff-1',
      trainingManagerRatePercent: 3,
    };

    beforeEach(() => {
      mockPrisma.class.findUnique.mockResolvedValue({
        id: classId,
        trainingManagerStaffId: 'staff-1',
        trainingManagerRatePercent: 3,
      });
      mockPrisma.class.update.mockResolvedValue(updatedClass);
      mockPrisma.staffInfo.update.mockResolvedValue({ id: 'staff-1' });
      mockPrisma.$transaction.mockImplementation(
        (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
      );
    });

    it('assigns training staff without touching roles', async () => {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-1',
        roles: [StaffRole.training],
        status: StaffStatus.active,
      });

      await expect(
        service.updateClassTrainingManager(
          classId,
          { trainingManagerStaffId: 'staff-1' },
          adminActor,
        ),
      ).resolves.toEqual(updatedClass);
      expect(mockPrisma.staffInfo.update).not.toHaveBeenCalled();
    });

    it('records action history when the rate percent changes', async () => {
      mockPrisma.class.update.mockResolvedValue({
        ...updatedClass,
        trainingManagerRatePercent: 2,
      });

      await service.updateClassTrainingManager(
        classId,
        { trainingManagerRatePercent: 2 },
        adminActor,
      );

      expect(mockActionHistory.recordUpdate).toHaveBeenCalledWith(mockPrisma, {
        actor: adminActor,
        entityType: 'class',
        entityId: classId,
        description: 'Cập nhật quản lý lớp / % quản lý',
        beforeValue: {
          trainingManagerStaffId: 'staff-1',
          trainingManagerRatePercent: 3,
        },
        afterValue: {
          trainingManagerStaffId: 'staff-1',
          trainingManagerRatePercent: 2,
        },
      });
    });

    it('skips action history when nothing changes', async () => {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-1',
        roles: [StaffRole.training],
        status: StaffStatus.active,
      });

      await service.updateClassTrainingManager(
        classId,
        { trainingManagerStaffId: 'staff-1', trainingManagerRatePercent: 3 },
        adminActor,
      );

      expect(mockActionHistory.recordUpdate).not.toHaveBeenCalled();
    });

    it('grants training role when a teacher becomes class manager', async () => {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-1',
        roles: [StaffRole.teacher],
        status: StaffStatus.active,
      });

      await expect(
        service.updateClassTrainingManager(
          classId,
          { trainingManagerStaffId: 'staff-1', trainingManagerRatePercent: 5 },
          adminActor,
        ),
      ).resolves.toEqual(updatedClass);
      expect(mockPrisma.staffInfo.update).toHaveBeenCalledWith({
        where: { id: 'staff-1' },
        data: { roles: { push: StaffRole.training } },
        select: { id: true },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects staff that is neither training nor teacher', async () => {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-1',
        roles: [StaffRole.customer_care],
        status: StaffStatus.active,
      });

      await expect(
        service.updateClassTrainingManager(
          classId,
          { trainingManagerStaffId: 'staff-1' },
          adminActor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.class.update).not.toHaveBeenCalled();
    });

    it('rejects staff without assistant role', async () => {
      mockPrisma.staffInfo.findFirst.mockResolvedValue({
        roles: [StaffRole.training],
      });

      await expect(
        service.updateClassTrainingManager(
          classId,
          { trainingManagerRatePercent: 2 },
          { userId: 'staff-user', roleType: UserRole.staff },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrisma.class.update).not.toHaveBeenCalled();
    });

    it('rejects inactive teacher', async () => {
      mockPrisma.staffInfo.findUnique.mockResolvedValue({
        id: 'staff-1',
        roles: [StaffRole.teacher],
        status: StaffStatus.inactive,
      });

      await expect(
        service.updateClassTrainingManager(
          classId,
          { trainingManagerStaffId: 'staff-1' },
          adminActor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateSessionRatePercent', () => {
    const staffId = 'UNISTAFF-1';
    const sessionId = '15ecdca1-4cbb-4148-9929-8e8cdab3b90d';
    const adminActor = {
      userId: 'admin-user',
      userEmail: 'admin@edu.vn',
      roleType: UserRole.admin,
    };
    const pendingSession = {
      id: sessionId,
      date: new Date('2026-11-05T00:00:00.000Z'),
      trainingManagerStaffId: staffId,
      trainingManagerRatePercent: 2,
      trainingManagerAllowanceAmount: 7380,
      trainingManagerPaymentStatus: PaymentStatus.pending,
      attendance: [{ tuitionFee: 369000 }],
    };

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(
        (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
      );
      mockPrisma.session.update.mockResolvedValue({ id: sessionId });
    });

    it('recomputes allowance from session tuition and logs history', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(pendingSession);

      await expect(
        service.updateSessionRatePercent(adminActor, staffId, sessionId, 3),
      ).resolves.toEqual({
        sessionId,
        date: '2026-11-05T00:00:00.000Z',
        sessionTuitionTotal: 369000,
        trainingManagerRatePercent: 3,
        allowanceAmount: 11070,
        paymentStatus: PaymentStatus.pending,
      });
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: {
          trainingManagerRatePercent: 3,
          trainingManagerAllowanceAmount: 11070,
          trainingManagerPaymentStatus: PaymentStatus.pending,
        },
      });
      const [historyTx, historyInput] = mockActionHistory.recordUpdate.mock
        .calls[0] as [
        unknown,
        {
          entityType: string;
          entityId: string;
          beforeValue: Record<string, unknown>;
          afterValue: Record<string, unknown>;
        },
      ];
      expect(historyTx).toBe(mockPrisma);
      expect(historyInput.entityType).toBe('session');
      expect(historyInput.entityId).toBe(sessionId);
      expect(historyInput.beforeValue).toMatchObject({
        trainingManagerRatePercent: 2,
        trainingManagerAllowanceAmount: 7380,
      });
      expect(historyInput.afterValue).toMatchObject({
        trainingManagerRatePercent: 3,
        trainingManagerAllowanceAmount: 11070,
      });
    });

    it('rejects paid sessions', async () => {
      mockPrisma.session.findFirst.mockResolvedValue({
        ...pendingSession,
        trainingManagerPaymentStatus: PaymentStatus.paid,
      });

      await expect(
        service.updateSessionRatePercent(adminActor, staffId, sessionId, 3),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.session.update).not.toHaveBeenCalled();
    });

    it.each([0, -1, 101, 'abc'])('rejects invalid rate %p', async (rate) => {
      await expect(
        service.updateSessionRatePercent(adminActor, staffId, sessionId, rate),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.session.findFirst).not.toHaveBeenCalled();
    });

    it('rejects sessions outside the staff scope', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSessionRatePercent(adminActor, staffId, sessionId, 3),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
