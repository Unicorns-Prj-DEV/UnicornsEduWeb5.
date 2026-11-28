import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';

/** `GET /api/partner-students/username-check/` */
export interface UniojUsernameCheckData {
  username: string;
  available: boolean;
  reason: 'INVALID_FORMAT' | 'TAKEN' | null;
  rule?: string;
}

/** Body `POST /api/partner-students/`. Chứa mật khẩu rõ — KHÔNG log. */
export interface UniojCreateStudentInput {
  external_id: string;
  username: string;
  password: string;
  full_name: string;
  province: string | null;
  birth_year: number | null;
  email: string | null;
}

export interface UniojCreateStudentData {
  external_id: string;
  username: string;
  role_active: boolean;
  created: boolean;
}

export type UniojRoleAction = 'deactivate' | 'activate';

export interface UniojRoleEventInput {
  reason: string;
  event_id: string;
  occurred_at: string;
}

export interface UniojRoleEventData {
  external_id: string;
  username?: string;
  role_active: boolean;
  last_event_at?: string | null;
  ignored?: boolean;
}

/**
 * Lỗi gọi UNIOJ. `code` = `error.code` của UNIOJ (USERNAME_TAKEN, STUDENT_NOT_FOUND…),
 * null khi lỗi mạng hoặc body không phải JSON (nginx 405/5xx trả HTML).
 */
export class UniojStudentSyncError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number | null,
    readonly code: string | null,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
  }

  /** 429 / 5xx / timeout / mạng: lỗi tạm thời, gửi lại được. */
  get isTransient(): boolean {
    return (
      this.httpStatus === null ||
      this.httpStatus === 429 ||
      this.httpStatus >= 500
    );
  }
}

const DEFAULT_BASE_URL = 'https://oj.uniedu.vn';
const CHECK_TIMEOUT_MS = 5_000;
const WRITE_TIMEOUT_MS = 15_000;

/** Client API UNIOJ «partner students» (đồng bộ học sinh, chỉ instance IT). */
@Injectable()
export class UniojStudentSyncClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.apiKey = config.get<string>('UNIOJ_API_KEY', '');
    this.baseUrl = (
      config.get<string>('UNIOJ_BASE_URL', DEFAULT_BASE_URL) || DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  checkUsername(username: string): Promise<UniojUsernameCheckData> {
    return this.request<UniojUsernameCheckData>(
      'GET',
      '/api/partner-students/username-check/',
      { params: { username }, timeout: CHECK_TIMEOUT_MS },
    );
  }

  createStudent(
    input: UniojCreateStudentInput,
  ): Promise<UniojCreateStudentData> {
    return this.request<UniojCreateStudentData>(
      'POST',
      '/api/partner-students/',
      { data: input, timeout: WRITE_TIMEOUT_MS },
    );
  }

  setRole(
    externalId: string,
    action: UniojRoleAction,
    input: UniojRoleEventInput,
  ): Promise<UniojRoleEventData> {
    return this.request<UniojRoleEventData>(
      'POST',
      `/api/partner-students/${encodeURIComponent(externalId)}/${action}/`,
      { data: input, timeout: WRITE_TIMEOUT_MS },
    );
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    options: {
      params?: Record<string, string>;
      data?: unknown;
      timeout: number;
    },
  ): Promise<T> {
    try {
      const res = await this.http.axiosRef.request<{ data?: T }>({
        method,
        url: `${this.baseUrl}${path}`,
        headers: { Authorization: `Bearer ${this.apiKey}` },
        params: options.params,
        data: options.data,
        timeout: options.timeout,
        // UNIOJ đổi domain bằng 301 làm hỏng POST — không theo redirect.
        maxRedirects: 0,
      });
      if (!res.data?.data) {
        throw new UniojStudentSyncError(
          'UNIOJ trả dữ liệu rỗng',
          res.status,
          null,
        );
      }
      return res.data.data;
    } catch (error) {
      if (error instanceof UniojStudentSyncError) throw error;
      if (isAxiosError(error)) {
        const status = error.response?.status ?? null;
        // Chỉ đọc `error.code/message` — không bao giờ đưa request body (mật khẩu) vào lỗi.
        const body: unknown = error.response?.data;
        const apiError =
          body && typeof body === 'object' && 'error' in body
            ? (body as { error?: { code?: unknown; message?: unknown } }).error
            : undefined;
        const code = typeof apiError?.code === 'string' ? apiError.code : null;
        const detail =
          (typeof apiError?.message === 'string' && apiError.message) ||
          (status ? `HTTP ${status}` : error.code || 'network error');
        const retryAfter = Number(error.response?.headers?.['retry-after']);
        throw new UniojStudentSyncError(
          `UNIOJ ${method} ${path.split('/').slice(0, 3).join('/')} ${status ?? 'network'}${code ? ` ${code}` : ''}: ${detail}`.slice(
            0,
            500,
          ),
          status,
          code,
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
        );
      }
      throw new UniojStudentSyncError(
        error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
        null,
        null,
      );
    }
  }
}
