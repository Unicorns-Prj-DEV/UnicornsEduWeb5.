import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from '@/dtos/Auth.dto';
import { api } from '../client';

export async function logIn(dto: LoginDto) {
    console.log("[Auth API] POST /auth/login", { email: dto.email });
    try {
        const response = await api.post('/auth/login', dto);
        console.log("[Auth API] login success", { hasTokens: !!(response.data?.accessToken) });
        return response.data;
    } catch (err: unknown) {
        const ax = err as { code?: string; message?: string; response?: { status: number; data?: unknown } };
        console.error("[Auth API] login failed", {
            code: ax.code,
            message: ax.message,
            status: ax.response?.status,
            data: ax.response?.data,
        });
        throw err;
    }
}

export async function register(RegisterDto: RegisterDto) {
    const response = await api.post('/auth/register', RegisterDto);
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

export async function getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
}

export async function logout() {
    const response = await api.post('/auth/logout');
    return response.data;
}