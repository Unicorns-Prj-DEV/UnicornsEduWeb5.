export interface LoginDto {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface RegisterDto extends LoginDto {
    phoneNumber?: string;
    name?: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    password: string;
}