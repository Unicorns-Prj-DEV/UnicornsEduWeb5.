jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('src/action-history/action-history.service', () => ({
  ActionHistoryService: class ActionHistoryServiceMock {},
}));

import { ForbiddenException } from '@nestjs/common';
import { UserRole } from 'generated/enums';
import type { Profile } from 'passport-google-oauth20';
import { REGISTRATION_DISABLED_CODE } from '../constants';
import { GoogleStrategy } from './google-oauth.strategy';

describe('GoogleStrategy', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => `${key}-value`),
  };
  const prisma = {
    $transaction: jest.fn(),
  };
  const actionHistoryService = {
    recordUpdate: jest.fn(),
    recordCreate: jest.fn(),
  };
  const authIdentityCacheService = {
    invalidateUser: jest.fn(),
  };

  let strategy: GoogleStrategy;

  const profile: Profile = {
    id: 'google-1',
    displayName: 'Test User',
    name: {
      familyName: 'User',
      givenName: 'Test',
    },
    emails: [{ value: 'test@example.com', verified: true }],
    photos: [{ value: 'https://example.com/avatar.png' }],
    provider: 'google',
    profileUrl: 'https://example.com',
    _raw: '',
    _json: {} as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new GoogleStrategy(
      configService as never,
      prisma as never,
      actionHistoryService as never,
      authIdentityCacheService as never,
    );
  });

  it('rejects Google sign-in when the email is not already registered', async () => {
    prisma.$transaction.mockImplementation(
      async (callback: (tx: { user: { findUnique: jest.Mock } }) => unknown) =>
        callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        }),
    );

    const callback = jest.fn();

    await expect(
      strategy.validate('access-token', 'refresh-token', profile, callback),
    ).rejects.toThrow(new ForbiddenException(REGISTRATION_DISABLED_CODE));

    expect(callback).not.toHaveBeenCalled();
    expect(authIdentityCacheService.invalidateUser).not.toHaveBeenCalled();
  });

  it('returns an existing verified user without creating a new account', async () => {
    const existingUser = {
      id: 'user-1',
      email: 'test@example.com',
      accountHandle: 'test@example.com',
      roleType: UserRole.guest,
      emailVerified: true,
      passwordHash: null,
      staffInfo: null,
      studentInfo: null,
    };

    prisma.$transaction.mockImplementation(
      async (callback: (tx: { user: { findUnique: jest.Mock } }) => unknown) =>
        callback({
          user: {
            findUnique: jest.fn().mockResolvedValue(existingUser),
          },
        }),
    );

    const callback = jest.fn();

    await strategy.validate('access-token', 'refresh-token', profile, callback);

    expect(callback).toHaveBeenCalledWith(null, existingUser);
    expect(authIdentityCacheService.invalidateUser).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('verifies an existing unverified user and records action history', async () => {
    const existingUser = {
      id: 'user-2',
      email: 'test@example.com',
      accountHandle: 'test@example.com',
      roleType: UserRole.guest,
      emailVerified: false,
      passwordHash: null,
      staffInfo: null,
      studentInfo: null,
    };
    const updatedUser = {
      ...existingUser,
      emailVerified: true,
    };

    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(updatedUser);
    const update = jest.fn().mockResolvedValue(updatedUser);

    prisma.$transaction.mockImplementation(
      async (
        callback: (tx: {
          user: {
            findUnique: jest.Mock;
            update: jest.Mock;
          };
        }) => unknown,
      ) =>
        callback({
          user: {
            findUnique,
            update,
          },
        }),
    );

    const callback = jest.fn();

    await strategy.validate('access-token', 'refresh-token', profile, callback);

    expect(update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: { emailVerified: true },
    });
    expect(actionHistoryService.recordUpdate).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, updatedUser);
  });
});
