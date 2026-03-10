import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from 'generated/enums';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '0901234567' })
    @IsString()
    phone: string;

    @ApiProperty({ example: 'StrongPass123!' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'Nguyen Van A' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'TP.HCM' })
    @IsString()
    @IsOptional()
    province?: string;

    @ApiProperty({ example: 'nguyenvana' })
    @IsString()
    accountHandle: string;
}

export class UserInfoDto {
    @ApiPropertyOptional({ example: 'user@example.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: '0901234567' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'Nguyen Van A' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    roleType?: UserRole;

    @ApiPropertyOptional({ enum: UserStatus })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;

    @ApiPropertyOptional({ description: 'Linked entity id' })
    @IsOptional()
    @IsUUID()
    linkId?: string;

    @ApiPropertyOptional({ example: 'TP.HCM' })
    @IsOptional()
    @IsString()
    province?: string;

    @ApiPropertyOptional({ example: 'nguyenvana' })
    @IsOptional()
    @IsString()
    accountHandle?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    emailVerified?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    phoneVerified?: boolean;
}

export class UpdateUserDto extends PartialType(UserInfoDto) {
    @ApiProperty({ description: 'User id' })
    @IsUUID()
    id: string;
}

export class UserAuthDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'StrongPass123!' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    rememberMe?: boolean;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({ description: 'Reset password token from email' })
    @IsString()
    token: string;

    @ApiProperty({ example: 'NewStrongPass123!' })
    @IsString()
    @MinLength(6)
    password: string;
}

export class RefreshUserDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsUUID()
    id: string;

    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ enum: UserRole })
    @IsEnum(UserRole)
    roleType: UserRole[];
}
