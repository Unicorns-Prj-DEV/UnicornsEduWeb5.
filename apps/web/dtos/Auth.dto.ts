export enum Role {
    admin = "admin",
    staff = "staff",
    student = "student",
    guest = "guest",
}

export interface LoginDto {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface RegisterDto extends LoginDto {
    fullName: string;
    phoneNumber: string;
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
    email: string;
    roleType: Role;
}