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
import { StaffRole, UserRole, UserStatus } from 'generated/enums';
import { PaginationQueryDto } from './pagination.dto';

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

  @ApiProperty({ example: 'TP.HCM' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiProperty({ example: 'nguyenvana' })
  @IsString()
  accountHandle: string;

  @ApiProperty({ example: 'Nguyen' })
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Van A' })
  @IsString()
  last_name: string;
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

  @ApiPropertyOptional({
    enum: StaffRole,
    isArray: true,
    description:
      'Detailed staff roles to persist when roleType is staff. Missing profile will be auto-created if needed.',
  })
  @IsOptional()
  @IsEnum(StaffRole, { each: true })
  staffRoles?: StaffRole[];
}

export class UpdateUserDto extends PartialType(UserInfoDto) {
  @ApiProperty({ description: 'User id' })
  @IsUUID()
  id: string;
}

export class GetUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'nguyen van',
    description:
      'Search by account handle, email, phone, first name, or last name.',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class UserAuthDto {
  @ApiProperty({ example: 'nguyenvan' })
  @IsString()
  accountHandle: string;

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

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password', example: 'NewStrongPass123!' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class SetupPasswordDto {
  @ApiProperty({
    description: 'First password for an OAuth-created account',
    example: 'NewStrongPass123!',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export interface RefreshUserDto {
  id: string;
  accountHandle: string;
  roleType: UserRole;
}
