import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardCacheService implements OnModuleInit {
  private readonly logger = new Logger(DashboardCacheService.name);
  private readonly defaultTtlSeconds: number;
  private readonly cleanupIntervalMs = 15 * 60 * 1000;
  private cleanupPromise: Promise<void> | null = null;
  private lastCleanupStartedAt = 0;
  private hasLoggedUnavailable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.defaultTtlSeconds = this.parsePositiveInteger(
      this.configService.get<string>('DASHBOARD_CACHE_DEFAULT_TTL_SECONDS'),
      60,
    );
  }

  async onModuleInit() {
    await this.cleanupExpiredEntries();
  }

  async getJson<T>(key: string): Promise<T | null> {
    void this.maybeCleanupExpiredEntries();

    try {
      const cachedEntry = await this.prisma.dashboardCache.findUnique({
        where: { cacheKey: key },
      });

      if (!cachedEntry) {
        this.hasLoggedUnavailable = false;
        return null;
      }

      if (cachedEntry.expiresAt.getTime() <= Date.now()) {
        this.hasLoggedUnavailable = false;
        await this.del(key);
        return null;
      }

      this.hasLoggedUnavailable = false;
      return cachedEntry.data as T;
    } catch (error) {
      this.logUnavailable(
        'Dashboard cache read failed. Falling back to fresh PostgreSQL responses.',
        error,
      );
      return null;
    }
  }

  async setJson<T>(options: {
    key: string;
    cacheType: string;
    value: T;
    ttlSeconds?: number;
  }) {
    void this.maybeCleanupExpiredEntries();

    try {
      const expiresAt = new Date(
        Date.now() + this.normalizeTtlSeconds(options.ttlSeconds) * 1000,
      );

      await this.prisma.dashboardCache.upsert({
        where: { cacheKey: options.key },
        create: {
          cacheKey: options.key,
          cacheType: options.cacheType,
          data: options.value as Prisma.InputJsonValue,
          expiresAt,
        },
        update: {
          cacheType: options.cacheType,
          data: options.value as Prisma.InputJsonValue,
          expiresAt,
        },
      });
      this.hasLoggedUnavailable = false;
    } catch (error) {
      this.logUnavailable(
        'Dashboard cache write failed. Continuing without cached storage.',
        error,
      );
    }
  }

  async del(key: string) {
    try {
      await this.prisma.dashboardCache.deleteMany({
        where: { cacheKey: key },
      });
      this.hasLoggedUnavailable = false;
    } catch (error) {
      this.logUnavailable(
        'Dashboard cache delete failed. Continuing without invalidation.',
        error,
      );
    }
  }

  async wrapJson<T>(options: {
    key: string;
    cacheType: string;
    loader: () => Promise<T>;
    ttlSeconds?: number;
  }): Promise<T> {
    const cachedValue = await this.getJson<T>(options.key);
    if (cachedValue != null) {
      return cachedValue;
    }

    const freshValue = await options.loader();
    await this.setJson({
      key: options.key,
      cacheType: options.cacheType,
      value: freshValue,
      ttlSeconds: options.ttlSeconds,
    });

    return freshValue;
  }

  private async maybeCleanupExpiredEntries() {
    const now = Date.now();

    if (now - this.lastCleanupStartedAt < this.cleanupIntervalMs) {
      return;
    }

    await this.cleanupExpiredEntries();
  }

  private async cleanupExpiredEntries() {
    if (this.cleanupPromise) {
      return this.cleanupPromise;
    }

    this.lastCleanupStartedAt = Date.now();
    this.cleanupPromise = this.prisma.dashboardCache
      .deleteMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
      })
      .then(() => {
        this.hasLoggedUnavailable = false;
      })
      .catch((error: unknown) => {
        this.logUnavailable(
          'Dashboard cache cleanup failed. Expired cache rows will be retried later.',
          error,
        );
      })
      .finally(() => {
        this.cleanupPromise = null;
      });

    await this.cleanupPromise;
  }

  private normalizeTtlSeconds(ttlSeconds?: number) {
    if (typeof ttlSeconds === 'number' && Number.isFinite(ttlSeconds)) {
      return Math.max(1, Math.floor(ttlSeconds));
    }

    return this.defaultTtlSeconds;
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.floor(parsed);
  }

  private logUnavailable(message: string, error: unknown) {
    if (this.hasLoggedUnavailable) {
      return;
    }

    this.hasLoggedUnavailable = true;
    const details =
      error instanceof Error ? error.message : 'Unknown cache table error';
    this.logger.warn(`${message} (${details})`);
  }
}
