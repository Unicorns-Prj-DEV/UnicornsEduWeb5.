import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from '@/dtos/Auth.dto';
import { api } from '../client';

export async function logIn(dto: LoginDto) {
    try {
        const response = await api.post("/auth/login", dto);
        return response.data;
    } catch (err: unknown) {
        const ax = err as { code?: string; message?: string; response?: { status: number; data?: { message?: string } } };
        throw err;
    }
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

export async function getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.post('/auth/change-password', data);
    return response.data;
}

export async function logout() {
    const response = await api.post('/auth/logout');
    return response.data;
}