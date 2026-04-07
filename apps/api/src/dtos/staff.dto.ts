import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StaffRole, StaffStatus } from 'generated/enums';
import {
  IsArray,
  IsInt,
  IsDateString,
  IsEnum,
  Matches,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SearchAssignableStaffUsersDto {
  @ApiProperty({
    description: 'Full or partial email to search existing users',
    example: 'teacher@example.com',
  })
  @IsString()
  @MinLength(2)
  email: string;
}

export class SearchCustomerCareStaffDto {
  @ApiPropertyOptional({
    description: 'Full or partial staff full name',
    example: 'Nguyen',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Max number of options to return (default 20, max 50)',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class SearchStaffOptionsDto {
  @ApiPropertyOptional({
    description: 'Full or partial staff full name',
    example: 'Nguyen',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Max number of options to return (default 20, max 50)',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreateStaffDto {
  @ApiProperty({ example: 'Nguyen Van B' })
  @IsString()
  full_name: string;

  @ApiProperty({
    example: '012345678901',
    description: 'Số CCCD gồm đúng 12 chữ số',
  })
  @IsString()
  @Matches(/^\d{12}$/, { message: 'Số CCCD phải gồm đúng 12 chữ số.' })
  cccd_number: string;

  @ApiPropertyOptional({ example: '2022-01-15' })
  @IsOptional()
  @IsDateString()
  cccd_issued_date?: string;

  @ApiPropertyOptional({ example: 'Cục CSQLHC về TTXH' })
  @IsOptional()
  @IsString()
  cccd_issued_place?: string;

  @ApiPropertyOptional({ example: '1998-01-01' })
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @ApiPropertyOptional({ example: 'HCMUT' })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiPropertyOptional({ example: 'Le Hong Phong' })
  @IsOptional()
  @IsString()
  high_school?: string;

  @ApiPropertyOptional({ example: 'Math' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  bank_account?: string;

  @ApiPropertyOptional({ example: 'https://example.com/qr.png' })
  @IsOptional()
  @IsString()
  bank_qr_link?: string;

  @ApiProperty({ enum: StaffRole, isArray: true })
  @IsArray()
  @IsEnum(StaffRole, { each: true })
  roles: StaffRole[];

  @ApiProperty({ description: 'User id' })
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional({
    description:
      'Staff id of the assistant who manages this CSKH staff (only valid when staff has customer_care role)',
  })
  @IsOptional()
  @IsUUID()
  customer_care_managed_by_staff_id?: string | null;
}

export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @ApiProperty({ description: 'Staff id' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ enum: StaffStatus })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}

export interface StaffIncomeAmountSummaryDto {
  total: number;
  paid: number;
  unpaid: number;
}

export interface StaffIncomeClassSummaryDto extends StaffIncomeAmountSummaryDto {
  classId: string;
  className: string;
}

export interface StaffIncomeRoleSummaryDto extends StaffIncomeAmountSummaryDto {
  role: string;
  label: string;
}

export interface StaffIncomeDepositSessionDto {
  id: string;
  date: string;
  teacherPaymentStatus: string | null;
  teacherAllowanceTotal: number;
}

export interface StaffIncomeDepositClassSummaryDto {
  classId: string;
  className: string;
  total: number;
  sessions: StaffIncomeDepositSessionDto[];
}

export interface StaffIncomeSummaryDto {
  recentUnpaidDays: number;
  monthlyIncomeTotals: StaffIncomeAmountSummaryDto;
  sessionMonthlyTotals: StaffIncomeAmountSummaryDto;
  sessionYearTotal: number;
  yearIncomeTotal: number;
  depositYearTotal: number;
  depositYearByClass: StaffIncomeDepositClassSummaryDto[];
  classMonthlySummaries: StaffIncomeClassSummaryDto[];
  bonusMonthlyTotals: StaffIncomeAmountSummaryDto;
  otherRoleSummaries: StaffIncomeRoleSummaryDto[];
}
