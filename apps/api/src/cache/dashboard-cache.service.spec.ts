jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { ConfigService } from '@nestjs/config';
import { DashboardCacheService } from './dashboard-cache.service';

function createConfigService(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

function createPrismaService() {
  return {
    dashboardCache: {
      deleteMany: jest.fn<Promise<{ count: number }>, [unknown?]>(() =>
        Promise.resolve({ count: 0 }),
      ),
      findUnique: jest.fn<
        Promise<{ data: unknown; expiresAt: Date } | null>,
        [unknown]
      >(() => Promise.resolve(null)),
      upsert: jest.fn<Promise<unknown>, [unknown]>(() => Promise.resolve({})),
    },
  };
}

describe('DashboardCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached JSON when an unexpired row exists', async () => {
    const prisma = createPrismaService();
    prisma.dashboardCache.findUnique.mockResolvedValueOnce({
      data: { total: 42 },
      expiresAt: new Date(Date.now() + 60_000),
    });

    const service = new DashboardCacheService(
      prisma as never,
      createConfigService({}),
    );

    const loader = jest.fn(() => Promise.resolve({ total: 0 }));
    const result = await service.wrapJson({
      key: 'dashboard:summary',
      cacheType: 'aggregate',
      loader,
    });

    expect(result).toEqual({ total: 42 });
    expect(loader).not.toHaveBeenCalled();
    expect(prisma.dashboardCache.upsert).not.toHaveBeenCalled();
  });

  it('loads and stores fresh JSON when the cache row is missing', async () => {
    const prisma = createPrismaService();
    prisma.dashboardCache.findUnique.mockResolvedValueOnce(null);

    const service = new DashboardCacheService(
      prisma as never,
      createConfigService({
        DASHBOARD_CACHE_DEFAULT_TTL_SECONDS: '90',
      }),
    );

    const result = await service.wrapJson({
      key: 'dashboard:summary',
      cacheType: 'aggregate',
      loader: () => Promise.resolve({ total: 7 }),
    });

    expect(result).toEqual({ total: 7 });
    const upsertArgs = prisma.dashboardCache.upsert.mock.calls[0]?.[0] as {
      create: { cacheKey: string; cacheType: string; data: { total: number } };
      update: { cacheType: string; data: { total: number } };
      where: { cacheKey: string };
    };

    expect(upsertArgs.where.cacheKey).toBe('dashboard:summary');
    expect(upsertArgs.create.cacheKey).toBe('dashboard:summary');
    expect(upsertArgs.create.cacheType).toBe('aggregate');
    expect(upsertArgs.create.data).toEqual({ total: 7 });
    expect(upsertArgs.update.cacheType).toBe('aggregate');
    expect(upsertArgs.update.data).toEqual({ total: 7 });
  });

  it('shares one loader across concurrent misses for the same key', async () => {
    const prisma = createPrismaService();
    prisma.dashboardCache.findUnique.mockResolvedValue(null);

    const service = new DashboardCacheService(
      prisma as never,
      createConfigService({}),
    );

    let releaseLoader: () => void = () => undefined;
    const loaderRelease = new Promise<void>((resolve) => {
      releaseLoader = resolve;
    });
    let loaderCalls = 0;
    const loader = jest.fn(async () => {
      loaderCalls += 1;
      const value = { total: loaderCalls };
      await loaderRelease;
      return value;
    });

    const firstResultPromise = service.wrapJson({
      key: 'dashboard:summary',
      cacheType: 'aggregate',
      loader,
    });
    const secondResultPromise = service.wrapJson({
      key: 'dashboard:summary',
      cacheType: 'aggregate',
      loader,
    });

    releaseLoader();

    await expect(
      Promise.all([firstResultPromise, secondResultPromise]),
    ).resolves.toEqual([{ total: 1 }, { total: 1 }]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(prisma.dashboardCache.upsert).toHaveBeenCalledTimes(1);
  });

  it('treats expired cache rows as misses and deletes them', async () => {
    const prisma = createPrismaService();
    prisma.dashboardCache.findUnique.mockResolvedValueOnce({
      data: { total: 1 },
      expiresAt: new Date(Date.now() - 60_000),
    });

    const service = new DashboardCacheService(
      prisma as never,
      createConfigService({}),
    );

    const result = await service.wrapJson({
      key: 'dashboard:summary',
      cacheType: 'aggregate',
      loader: () => Promise.resolve({ total: 9 }),
    });

    expect(result).toEqual({ total: 9 });
    expect(prisma.dashboardCache.deleteMany).toHaveBeenCalledWith({
      where: { cacheKey: 'dashboard:summary' },
    });
    expect(prisma.dashboardCache.upsert).toHaveBeenCalled();
  });

  it('fails open when cache reads or writes error', async () => {
    const prisma = createPrismaService();
    prisma.dashboardCache.findUnique.mockRejectedValueOnce(
      new Error('cache table unavailable'),
    );
    prisma.dashboardCache.upsert.mockRejectedValueOnce(
      new Error('cache write unavailable'),
    );

    const service = new DashboardCacheService(
      prisma as never,
      createConfigService({}),
    );

    const loader = jest.fn(() => Promise.resolve({ total: 5 }));
    const result = await service.wrapJson({
      key: 'dashboard:summary',
      cacheType: 'aggregate',
      loader,
    });

    expect(result).toEqual({ total: 5 });
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
