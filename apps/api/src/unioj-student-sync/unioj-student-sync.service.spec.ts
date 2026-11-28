jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { BadRequestException, HttpException } from '@nestjs/common';
import { StudentStatus } from 'generated/enums';
import { UniojStudentSyncError } from './unioj-student-sync.client';
import {
  enqueueUniojRoleEvent,
  enqueueUniojStatusChange,
  generateUlid,
} from './unioj-student-sync.events';
import {
  computeNextAttemptAt,
  UniojStudentSyncService,
} from './unioj-student-sync.service';

describe('unioj-student-sync events', () => {
  const tx = { uniojStudentSyncEvent: { create: jest.fn() } };
  beforeEach(() => jest.clearAllMocks());

  it('ULID 26 ký tự Crockford, giữ thứ tự thời gian', () => {
    const a = generateUlid(1_700_000_000_000);
    const b = generateUlid(1_700_000_000_001);
    expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(a.slice(0, 10) < b.slice(0, 10)).toBe(true);
  });

  it('học sinh chưa có tài khoản UNIOJ → không ghi outbox', async () => {
    await enqueueUniojRoleEvent(
      tx as never,
      { id: 'UNIST-0123456789', uniojUsername: null },
      'student_deleted',
    );
    expect(tx.uniojStudentSyncEvent.create).not.toHaveBeenCalled();
  });

  it('nghỉ học → deactivate, học lại → activate, không đổi → bỏ qua', async () => {
    const student = {
      id: 'UNIST-0123456789',
      uniojUsername: 'minh',
      status: StudentStatus.active,
    };
    await enqueueUniojStatusChange(
      tx as never,
      student,
      StudentStatus.inactive,
    );
    await enqueueUniojStatusChange(
      tx as never,
      { ...student, status: StudentStatus.inactive },
      StudentStatus.active,
    );
    await enqueueUniojStatusChange(tx as never, student, StudentStatus.active);

    const calls = tx.uniojStudentSyncEvent.create.mock.calls.map(
      ([arg]: [{ data: { action: string; reason: string } }]) => arg.data,
    );
    expect(calls).toEqual([
      expect.objectContaining({
        action: 'deactivate',
        reason: 'student_inactive',
      }),
      expect.objectContaining({
        action: 'activate',
        reason: 'student_reactivated',
      }),
    ]);
  });
});

describe('computeNextAttemptAt', () => {
  const now = new Date('2026-11-26T00:00:00Z');
  it('lũy thừa 1, 2, 4 phút và trần 60 phút', () => {
    const delay = (n: number, ra: number | null = null) =>
      computeNextAttemptAt(n, now, ra).getTime() - now.getTime();
    expect(delay(1)).toBe(60_000);
    expect(delay(3)).toBe(240_000);
    expect(delay(20)).toBe(3_600_000);
    expect(delay(1, 300)).toBe(300_000);
  });
});

describe('UniojStudentSyncService', () => {
  const prisma = {
    uniojStudentSyncEvent: { findMany: jest.fn(), update: jest.fn() },
  };
  const client = {
    isConfigured: true,
    checkUsername: jest.fn(),
    createStudent: jest.fn(),
    setRole: jest.fn(),
  };
  const profile = { isIt: true };
  const service = new UniojStudentSyncService(
    prisma as never,
    client as never,
    profile as never,
  );
  const event = (id: string) => ({
    id,
    externalId: 'UNIST-0123456789',
    action: 'deactivate',
    reason: 'student_inactive',
    occurredAt: new Date('2026-11-25T08:00:00Z'),
    attempts: 0,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    profile.isIt = true;
  });

  it('checkUsername: sai luật UNIOJ thì không gọi UNIOJ', async () => {
    const res = await service.checkUsername('minh nguyễn');
    expect(res).toMatchObject({ available: false, reason: 'INVALID_FORMAT' });
    expect(client.checkUsername).not.toHaveBeenCalled();
  });

  it('checkUsername: instance không phải IT → enabled false', async () => {
    profile.isIt = false;
    const res = await service.checkUsername('minh');
    expect(res.enabled).toBe(false);
    expect(client.checkUsername).not.toHaveBeenCalled();
  });

  it('provisionAccount: USERNAME_TAKEN → 400, OJ sập / sai key → 503 UNIOJ_UNAVAILABLE', async () => {
    const input = {
      external_id: 'UNIST-0123456789',
      username: 'minh',
      password: 'secret',
      full_name: 'Minh',
      province: null,
      birth_year: null,
      email: null,
    };
    client.createStudent.mockRejectedValueOnce(
      new UniojStudentSyncError('taken', 409, 'USERNAME_TAKEN'),
    );
    await expect(service.provisionAccount(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    for (const failure of [
      new UniojStudentSyncError('down', 502, null),
      new UniojStudentSyncError('timeout', null, null),
      new UniojStudentSyncError('bad key', 401, null),
    ]) {
      client.createStudent.mockRejectedValueOnce(failure);
      const err: unknown = await service
        .provisionAccount(input)
        .catch((e: unknown) => e);
      if (!(err instanceof HttpException))
        throw new Error('expected HttpException');
      expect(err.getStatus()).toBe(503);
      expect(err.getResponse()).toMatchObject({ code: 'UNIOJ_UNAVAILABLE' });
    }
  });

  it('syncTick: 2xx → done, 5xx → retry backoff, 404 → failed', async () => {
    prisma.uniojStudentSyncEvent.findMany.mockResolvedValue([
      event('E1'),
      event('E2'),
      event('E3'),
    ]);
    client.setRole
      .mockResolvedValueOnce({
        external_id: 'x',
        role_active: false,
        ignored: true,
      })
      .mockRejectedValueOnce(new UniojStudentSyncError('down', 503, null))
      .mockRejectedValueOnce(
        new UniojStudentSyncError('nf', 404, 'STUDENT_NOT_FOUND'),
      );
    const now = new Date('2026-11-26T00:00:00Z');

    const res = await service.syncTick(now);

    expect(res).toEqual({ sent: 1, failed: 1 });
    expect(client.setRole).toHaveBeenCalledWith(
      'UNIST-0123456789',
      'deactivate',
      {
        reason: 'student_inactive',
        event_id: 'E1',
        occurred_at: '2026-11-25T08:00:00.000Z',
      },
    );
    const updates = prisma.uniojStudentSyncEvent.update.mock.calls.map(
      ([arg]: [{ where: { id: string }; data: Record<string, unknown> }]) => [
        arg.where.id,
        arg.data,
      ],
    );
    expect(updates[0]).toEqual([
      'E1',
      expect.objectContaining({ status: 'done' }),
    ]);
    expect(updates[1]).toEqual([
      'E2',
      expect.objectContaining({
        attempts: 1,
        nextAttemptAt: new Date('2026-11-26T00:01:00Z'),
      }),
    ]);
    expect(updates[1][1]).not.toHaveProperty('status');
    expect(updates[2]).toEqual([
      'E3',
      expect.objectContaining({ status: 'failed' }),
    ]);
  });
});
