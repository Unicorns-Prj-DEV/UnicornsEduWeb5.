import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma/prisma.service';

const DEVICE_TOKEN_BYTES = 32;
const LOGIN_REQUEST_TOKEN_BYTES = 32;
const LOGIN_REQUEST_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const DEVICE_INACTIVITY_DAYS = 60;

@Injectable()
export class UserDeviceService {
  private readonly logger = new Logger(UserDeviceService.name);

  constructor(private readonly prisma: PrismaService) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generateDeviceToken(): string {
    return randomBytes(DEVICE_TOKEN_BYTES).toString('hex');
  }

  generateLoginRequestToken(): string {
    return randomBytes(LOGIN_REQUEST_TOKEN_BYTES).toString('hex');
  }

  async createDevice(params: {
    userId: string;
    token: string;
    deviceInfo?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    const tokenHash = this.hashToken(params.token);
    return this.prisma.userDevice.create({
      data: {
        userId: params.userId,
        tokenHash,
        deviceInfo: (params.deviceInfo as Prisma.InputJsonValue) ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
        lastActiveAt: new Date(),
      },
    });
  }

  async findActiveDeviceByTokenHash(tokenHash: string) {
    return this.prisma.userDevice.findUnique({
      where: { tokenHash },
    });
  }

  async hasActiveDevice(userId: string): Promise<boolean> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DEVICE_INACTIVITY_DAYS);
    const count = await this.prisma.userDevice.count({
      where: {
        userId,
        lastActiveAt: { gte: cutoff },
      },
    });
    return count > 0;
  }

  async touchDevice(tokenHash: string) {
    return this.prisma.userDevice.updateMany({
      where: { tokenHash },
      data: { lastActiveAt: new Date() },
    });
  }

  async removeDevice(tokenHash: string) {
    return this.prisma.userDevice.deleteMany({
      where: { tokenHash },
    });
  }

  async removeAllDevicesForUser(userId: string) {
    return this.prisma.userDevice.deleteMany({
      where: { userId },
    });
  }

  async removeDeviceById(deviceId: string, userId: string) {
    return this.prisma.userDevice.deleteMany({
      where: { id: deviceId, userId },
    });
  }

  async listDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
  }

  // --- Login Requests ---

  async createLoginRequest(params: {
    userId: string;
    token: string;
    deviceInfo?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    const tokenHash = this.hashToken(params.token);
    const expiresAt = new Date(Date.now() + LOGIN_REQUEST_EXPIRY_MS);
    return this.prisma.loginRequest.create({
      data: {
        userId: params.userId,
        tokenHash,
        deviceInfo: (params.deviceInfo as Prisma.InputJsonValue) ?? undefined,
        ipAddress: params.ipAddress ?? undefined,
        expiresAt,
      },
    });
  }

  async findLoginRequestByTokenHash(tokenHash: string) {
    return this.prisma.loginRequest.findUnique({
      where: { tokenHash },
    });
  }

  async verifyLoginRequest(tokenHash: string) {
    return this.prisma.loginRequest.updateMany({
      where: { tokenHash, verified: false },
      data: { verified: true },
    });
  }

  async cleanupExpiredLoginRequests() {
    const result = await this.prisma.loginRequest.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired login requests`);
    }
    return result;
  }

  async cleanupInactiveDevices() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DEVICE_INACTIVITY_DAYS);
    const result = await this.prisma.userDevice.deleteMany({
      where: { lastActiveAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} inactive devices`);
    }
    return result;
  }
}
