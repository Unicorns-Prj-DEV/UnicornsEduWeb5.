jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { UserRole } from '../../generated/enums';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn((key: string) => `${key}-value`),
  };

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token'),
    verifyAsync: jest.fn(),
  };

  const mailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendForgotPasswordEmail: jest.fn().mockResolvedValue(undefined),
  };

  const actionHistoryService = {
    recordCreate: jest.fn(),
    recordUpdate: jest.fn(),
    recordDelete: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (callback: (db: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    service = new AuthService(
      mockPrisma as never,
      configService as never,
      jwtService as never,
      mailService as never,
      actionHistoryService as never,
    );
  });

  it('records action history after registering a new user', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.upsert.mockResolvedValue({
      id: 'user-1',
      email: 'new-user@example.com',
      phone: '0123456789',
      passwordHash: 'hashed-password',
      refreshToken: null,
      first_name: 'New',
      last_name: 'User',
      roleType: UserRole.guest,
      province: 'Hanoi',
      accountHandle: 'new-user',
      emailVerified: false,
      phoneVerified: false,
      linkId: null,
      status: 'active',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'new-user@example.com',
      phone: '0123456789',
      passwordHash: 'hashed-password',
      refreshToken: null,
      first_name: 'New',
      last_name: 'User',
      roleType: UserRole.guest,
      province: 'Hanoi',
      accountHandle: 'new-user',
      emailVerified: false,
      phoneVerified: false,
      linkId: null,
      status: 'active',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      updatedAt: new Date('2026-03-20T10:00:00.000Z'),
      staffInfo: null,
      studentInfo: null,
    });

    await service.register({
      email: 'new-user@example.com',
      phone: '0123456789',
      password: 'secret',
      first_name: 'New',
      last_name: 'User',
      province: 'Hanoi',
      accountHandle: 'new-user',
    });

    expect(actionHistoryService.recordCreate).toHaveBeenCalledWith(
      mockPrisma,
      expect.objectContaining({
        entityType: 'user',
        entityId: 'user-1',
      }),
    );
  });
});
