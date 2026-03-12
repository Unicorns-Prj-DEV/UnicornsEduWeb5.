export enum Role {
    admin = "admin",
    staff = "staff",
    student = "student",
    guest = "guest",
}

export interface LoginDto {
    accountHandle: string;
    password: string;
    rememberMe?: boolean;
}

export interface RegisterDto {
    email: string;
    phone: string;
    password: string;
    accountHandle: string;
    first_name: string;
    last_name: string;
    province?: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    password: string;
}

export interface UserInfoDto {
    id: string
    accountHandle: string;
    roleType: Role;
}