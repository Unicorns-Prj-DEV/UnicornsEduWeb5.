import {
    ForgotPasswordDto,
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    SetupPasswordDto,
    UserInfoDto,
} from '@/dtos/Auth.dto';
import type {
    BonusListResponse,
    CreateMyBonusPayload,
    UpdateMyBonusPayload,
} from '@/dtos/bonus.dto';
import type {
    CreateMyCommunicationExtraAllowancePayload,
    ExtraAllowanceListResponse,
    ExtraAllowanceRoleType,
    ExtraAllowanceStatus,
} from '@/dtos/extra-allowance.dto';
import type { LessonOutputStaffStatsResponse } from '@/dtos/lesson.dto';
import type {
    FullProfileDto,
    UpdateMyProfileDto,
    UpdateMyStaffProfileDto,
    UpdateMyStudentProfileDto,
} from '@/dtos/profile.dto';
import type { SessionItem } from '@/dtos/session.dto';
import type { StaffDetail, StaffIncomeSummary } from '@/dtos/staff.dto';
import type {
    StudentSelfDetail,
    StudentWalletTransaction,
    UpdateMyStudentAccountBalancePayload,
} from '@/dtos/student.dto';
import { api } from '../client';

export async function logIn(dto: LoginDto) {
    const response = await api.post("/auth/login", dto);
    return response.data;
}

export async function register(registerDto: RegisterDto) {
    const response = await api.post('/auth/register', registerDto);
    return response.data;
}

export async function forgotPassword(ForgotPasswordDto: ForgotPasswordDto) {
    const response = await api.post('/auth/forgot-password', ForgotPasswordDto);
    return response.data;
}

export async function resetPassword(ResetPasswordDto: ResetPasswordDto) {
    const response = await api.post('/auth/reset-password', ResetPasswordDto);
    return response.data;
}

export async function verifyEmail(token: string) {
    const response = await api.get(`/auth/verify?token=${token}`);
    return response.data;
}

export async function getProfile(): Promise<UserInfoDto> {
    const response = await api.get<UserInfoDto>('/auth/profile');
    return response.data;
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.post('/auth/change-password', data);
    return response.data;
}

export async function setupPassword(data: SetupPasswordDto) {
    const response = await api.post('/auth/setup-password', data);
    return response.data;
}

export async function logout() {
    const response = await api.post('/auth/logout');
    return response.data;
}

/** Full profile (user + staffInfo + studentInfo). Requires auth. */
export async function getFullProfile(): Promise<FullProfileDto> {
    const response = await api.get('/users/me/full');
    return response.data;
}

/** Update current user basic info. Returns updated full profile. */
export async function updateMyProfile(dto: UpdateMyProfileDto): Promise<FullProfileDto> {
    const response = await api.patch<FullProfileDto>('/users/me', dto);
    return response.data;
}

/** Update current user's staff record. Returns updated full profile. */
export async function updateMyStaffProfile(dto: UpdateMyStaffProfileDto): Promise<FullProfileDto> {
    const response = await api.patch<FullProfileDto>('/users/me/staff', dto);
    return response.data;
}

/** Update current user's student record. Returns updated full profile. */
export async function updateMyStudentProfile(dto: UpdateMyStudentProfileDto): Promise<FullProfileDto> {
    const response = await api.patch<FullProfileDto>('/users/me/student', dto);
    return response.data;
}

/** Current linked student detail for self-service pages. */
export async function getMyStudentDetail(): Promise<StudentSelfDetail> {
    const response = await api.get<StudentSelfDetail>('/users/me/student-detail');
    return response.data;
}

/** Current linked student wallet history for self-service pages. */
export async function getMyStudentWalletHistory(params?: {
    limit?: number;
}): Promise<StudentWalletTransaction[]> {
    const response = await api.get<StudentWalletTransaction[]>('/users/me/student-wallet-history', {
        params: {
            ...(typeof params?.limit === 'number' ? { limit: params.limit } : {}),
        },
    });

    return Array.isArray(response.data) ? response.data : [];
}

/** Current linked student wallet update for self-service pages. */
export async function updateMyStudentAccountBalance(
    dto: UpdateMyStudentAccountBalancePayload,
): Promise<StudentSelfDetail> {
    const response = await api.patch<StudentSelfDetail>('/users/me/student-account-balance', dto);
    return response.data;
}

/** Current linked staff detail for self-service pages. */
export async function getMyStaffDetail(): Promise<StaffDetail> {
    const response = await api.get<StaffDetail>('/users/me/staff-detail');
    return response.data;
}

/** Current linked staff income summary for self-service pages. */
export async function getMyStaffIncomeSummary(params: {
    month: string;
    year: string;
    days?: number;
}): Promise<StaffIncomeSummary> {
    const response = await api.get<StaffIncomeSummary>('/users/me/staff-income-summary', {
        params: {
            month: params.month,
            year: params.year,
            ...(typeof params.days === 'number' ? { days: params.days } : {}),
        },
    });
    return response.data;
}

/** Current linked staff bonuses for self-service pages. */
export async function getMyStaffBonuses(params: {
    page: number;
    limit: number;
    month?: string;
    status?: string;
}): Promise<BonusListResponse> {
    const response = await api.get<BonusListResponse>('/users/me/staff-bonuses', {
        params: {
            page: params.page,
            limit: params.limit,
            ...(params.month ? { month: params.month } : {}),
            ...(params.status ? { status: params.status } : {}),
        },
    });

    const payload = response.data as BonusListResponse;
    return {
        data: Array.isArray(payload?.data) ? payload.data : [],
        meta: {
            total: payload?.meta?.total ?? 0,
            page: payload?.meta?.page ?? params.page,
            limit: payload?.meta?.limit ?? params.limit,
        },
    };
}

/** Create a bonus for current linked staff. Status is enforced by backend. */
export async function createMyStaffBonus(
    dto: CreateMyBonusPayload,
) {
    const response = await api.post('/users/me/staff-bonuses', dto);
    return response.data;
}

/** Update a bonus for current linked staff. Payment status remains backend-managed. */
export async function updateMyStaffBonus(
    dto: UpdateMyBonusPayload,
) {
    const response = await api.patch('/users/me/staff-bonuses', dto);
    return response.data;
}

/** Current linked staff sessions for self-service pages. */
export async function getMyStaffSessions(params: {
    month: string;
    year: string;
}): Promise<SessionItem[]> {
    const response = await api.get<SessionItem[]>('/users/me/staff-sessions', {
        params: {
            month: params.month,
            year: params.year,
        },
    });

    return Array.isArray(response.data) ? response.data : [];
}

/** Current linked staff extra allowances for self-service role detail pages. */
export async function getMyStaffExtraAllowances(params: {
    page: number;
    limit: number;
    year?: string;
    month?: string;
    roleType?: ExtraAllowanceRoleType;
    status?: ExtraAllowanceStatus;
}): Promise<ExtraAllowanceListResponse> {
    const response = await api.get<ExtraAllowanceListResponse>('/users/me/staff-extra-allowances', {
        params: {
            page: params.page,
            limit: params.limit,
            ...(params.year ? { year: params.year } : {}),
            ...(params.month ? { month: params.month } : {}),
            ...(params.roleType ? { roleType: params.roleType } : {}),
            ...(params.status ? { status: params.status } : {}),
        },
    });

    const payload = response.data as ExtraAllowanceListResponse;
    return {
        data: Array.isArray(payload?.data) ? payload.data : [],
        meta: {
            total: payload?.meta?.total ?? 0,
            page: payload?.meta?.page ?? params.page,
            limit: payload?.meta?.limit ?? params.limit,
        },
    };
}

/** Self-service: staff with role `communication` creates a pending extra allowance for themselves. */
export async function createMyCommunicationExtraAllowance(
    dto: CreateMyCommunicationExtraAllowancePayload,
): Promise<unknown> {
    const response = await api.post('/users/me/staff-extra-allowances', dto);
    return response.data;
}

/** Current linked staff lesson output stats for self-service lesson-plan detail page. */
export async function getMyStaffLessonOutputStats(params?: {
    days?: number;
}): Promise<LessonOutputStaffStatsResponse> {
    const response = await api.get<LessonOutputStaffStatsResponse>('/users/me/staff-lesson-output-stats', {
        params: {
            ...(typeof params?.days === 'number' ? { days: params.days } : {}),
        },
    });

    return response.data;
}
