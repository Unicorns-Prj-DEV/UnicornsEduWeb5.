import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StaffRole, StaffStatus } from 'generated/enums';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

export class CreateStaffDto {
  @ApiProperty({ example: 'Nguyen Van B' })
  @IsString()
  full_name: string;

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
  depositYearTotal: number;
  depositYearByClass: StaffIncomeDepositClassSummaryDto[];
  classMonthlySummaries: StaffIncomeClassSummaryDto[];
  bonusMonthlyTotals: StaffIncomeAmountSummaryDto;
  otherRoleSummaries: StaffIncomeRoleSummaryDto[];
}
