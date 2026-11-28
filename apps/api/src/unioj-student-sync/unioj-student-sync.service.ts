import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { LmsProfileService } from 'src/lms-profile/lms-profile.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UniojCreateStudentData,
  UniojCreateStudentInput,
  UniojStudentSyncClient,
  UniojStudentSyncError,
} from './unioj-student-sync.client';
import {
  UNIOJ_EXTERNAL_ID_PATTERN,
  UNIOJ_USERNAME_PATTERN,
  UNIOJ_USERNAME_RULE,
} from './unioj-student-sync.events';

export interface UniojUsernameCheckResult {
  /** false = instance không phải IT, không cần kiểm tra. */
  enabled: boolean;
  username: string;
  available: boolean;
  reason: 'INVALID_FORMAT' | 'TAKEN' | null;
  message: string | null;
}

/**
 * `code` trong body lỗi khi UNIOJ sập / không gọi được (5xx, timeout, mạng, sai key,
 * chưa cấu hình). Web dựa vào code này để báo «Hệ thống OJ đang lỗi».
 */
export const UNIOJ_UNAVAILABLE_ERROR_CODE = 'UNIOJ_UNAVAILABLE';

/** 503 kèm `code: UNIOJ_UNAVAILABLE`. */
export function uniojUnavailableException(message: string): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: UNIOJ_UNAVAILABLE_ERROR_CODE,
      message,
    },
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

const TICK_BATCH_SIZE = 50;
const BASE_BACKOFF_MS = 60_000;
const MAX_BACKOFF_MS = 60 * 60_000;

/** Backoff lũy thừa: 1, 2, 4… phút, trần 60 phút; tôn trọng `Retry-After` của 429. */
export function computeNextAttemptAt(
  attempts: number,
  now: Date,
  retryAfterSeconds: number | null,
): Date {
  const exp = Math.min(
    BASE_BACKOFF_MS * 2 ** Math.max(attempts - 1, 0),
    MAX_BACKOFF_MS,
  );
  const delay = Math.max(exp, (retryAfterSeconds ?? 0) * 1000);
  return new Date(now.getTime() + delay);
}

/**
 * Đồng bộ học sinh LMS → UNIOJ (chỉ instance IT, CONTEXT «Đồng bộ học sinh UNIOJ»).
 * - Tạo tài khoản: gọi đồng bộ, UNIOJ từ chối/không trả lời thì không tạo tài khoản LMS.
 * - Gỡ/bật role: outbox `unioj_student_sync_events` + cron `syncTick`.
 */
@Injectable()
export class UniojStudentSyncService {
  private readonly logger = new Logger(UniojStudentSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: UniojStudentSyncClient,
    private readonly lmsProfile: LmsProfileService,
  ) {}

  get enabled(): boolean {
    return this.lmsProfile.isIt;
  }

  /** Kiểm tra handle trước khi tạo (form gọi khi gõ). Không giữ chỗ username. */
  async checkUsername(raw: string): Promise<UniojUsernameCheckResult> {
    const username = (raw ?? '').trim();
    if (!this.enabled) {
      return {
        enabled: false,
        username,
        available: true,
        reason: null,
        message: null,
      };
    }
    if (!UNIOJ_USERNAME_PATTERN.test(username)) {
      return {
        enabled: true,
        username,
        available: false,
        reason: 'INVALID_FORMAT',
        message: UNIOJ_USERNAME_RULE,
      };
    }
    this.assertConfigured();
    try {
      const data = await this.client.checkUsername(username);
      return {
        enabled: true,
        username: data.username ?? username,
        available: data.available,
        reason: data.reason,
        message:
          data.reason === 'TAKEN'
            ? 'Tên đăng nhập đã có tài khoản UNIOJ.'
            : data.reason === 'INVALID_FORMAT'
              ? data.rule || UNIOJ_USERNAME_RULE
              : null,
      };
    } catch (error) {
      throw this.toHttpError(error, 'kiểm tra tên đăng nhập');
    }
  }

  /** Validate trước khi tạo gì trên LMS (instance IT). */
  assertUsernameFormat(username: string): void {
    if (!this.enabled) return;
    if (!UNIOJ_USERNAME_PATTERN.test(username)) {
      throw new BadRequestException(UNIOJ_USERNAME_RULE);
    }
    this.assertConfigured();
  }

  /**
   * Tạo (upsert theo `external_id`) tài khoản UNIOJ. Lỗi → ném HttpException để caller
   * dừng việc tạo tài khoản LMS. Không log `input` (chứa mật khẩu rõ).
   */
  async provisionAccount(
    input: UniojCreateStudentInput,
  ): Promise<UniojCreateStudentData> {
    this.assertConfigured();
    if (!UNIOJ_EXTERNAL_ID_PATTERN.test(input.external_id)) {
      throw new BadRequestException('Mã học sinh không hợp lệ để tạo UNIOJ.');
    }
    try {
      return await this.client.createStudent(input);
    } catch (error) {
      throw this.toHttpError(error, 'tạo tài khoản');
    }
  }

  /** Một lượt cron: gửi các lệnh gỡ/bật role tới hạn. */
  async syncTick(now = new Date()): Promise<{ sent: number; failed: number }> {
    if (!this.enabled || !this.client.isConfigured) {
      return { sent: 0, failed: 0 };
    }
    const events = await this.prisma.uniojStudentSyncEvent.findMany({
      where: { status: 'pending', nextAttemptAt: { lte: now } },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      take: TICK_BATCH_SIZE,
    });
    let sent = 0;
    let failed = 0;
    for (const event of events) {
      const attempts = event.attempts + 1;
      try {
        // `ignored: true` (lệnh cũ hơn trạng thái UNIOJ đang có) vẫn là đã nhận.
        await this.client.setRole(event.externalId, event.action, {
          reason: event.reason,
          event_id: event.id,
          occurred_at: event.occurredAt.toISOString(),
        });
        await this.prisma.uniojStudentSyncEvent.update({
          where: { id: event.id },
          data: { status: 'done', attempts, sentAt: now, lastError: null },
        });
        sent += 1;
      } catch (error) {
        const syncError =
          error instanceof UniojStudentSyncError
            ? error
            : new UniojStudentSyncError(String(error), null, null);
        const permanent = !syncError.isTransient;
        await this.prisma.uniojStudentSyncEvent.update({
          where: { id: event.id },
          data: {
            attempts,
            lastError: syncError.message.slice(0, 500),
            ...(permanent
              ? { status: 'failed' }
              : {
                  nextAttemptAt: computeNextAttemptAt(
                    attempts,
                    now,
                    syncError.retryAfterSeconds,
                  ),
                }),
          },
        });
        if (permanent) {
          failed += 1;
          this.logger.error(
            `UNIOJ ${event.action} ${event.externalId} (event ${event.id}) bị từ chối, cần admin xử lý: ${syncError.message}`,
          );
        }
        // 401/403: mọi lệnh sau cũng sẽ lỗi — dừng lượt này.
        if (syncError.httpStatus === 401 || syncError.httpStatus === 403) {
          break;
        }
      }
    }
    return { sent, failed };
  }

  private assertConfigured(): void {
    if (!this.client.isConfigured) {
      this.logger.error('Chưa cấu hình UNIOJ_API_KEY trên instance IT.');
      throw uniojUnavailableException(
        'Hệ thống OJ đang lỗi (chưa cấu hình kết nối UNIOJ).',
      );
    }
  }

  private toHttpError(error: unknown, action: string) {
    if (!(error instanceof UniojStudentSyncError)) {
      this.logger.error(`UNIOJ ${action} lỗi`, error as Error);
      return uniojUnavailableException(
        `Hệ thống OJ đang lỗi, chưa ${action} được.`,
      );
    }
    this.logger.warn(`UNIOJ ${action}: ${error.message}`);
    switch (error.code) {
      case 'USERNAME_TAKEN':
        return new BadRequestException(
          'Tên đăng nhập đã có tài khoản UNIOJ. Chọn tên khác.',
        );
      case 'INVALID_USERNAME':
        return new BadRequestException(UNIOJ_USERNAME_RULE);
      case 'INVALID_FIELD':
        return new BadRequestException(
          `UNIOJ từ chối dữ liệu học sinh: ${error.message}`,
        );
      default:
        break;
    }
    if (error.httpStatus === 401 || error.httpStatus === 403) {
      this.logger.error(
        `UNIOJ từ chối key (HTTP ${error.httpStatus}) — kiểm tra UNIOJ_API_KEY / quyền Manage partner students.`,
      );
      return uniojUnavailableException(
        `Hệ thống OJ đang lỗi (LMS không được phép gọi UNIOJ), chưa ${action} được.`,
      );
    }
    if (!error.isTransient) {
      // 4xx khác (405, 404 dạng HTML…) — cũng là lỗi phía hệ thống, không phải người dùng.
      this.logger.error(`UNIOJ ${action} trả lỗi bất thường: ${error.message}`);
    } else {
      this.logger.error(`UNIOJ không phản hồi khi ${action}: ${error.message}`);
    }
    return uniojUnavailableException(
      `Hệ thống OJ đang lỗi, chưa ${action} được.`,
    );
  }
}
