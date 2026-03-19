import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StaffRole } from 'generated/enums';
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

export interface StaffIncomeSummaryDto {
  recentUnpaidDays: number;
  sessionMonthlyTotals: StaffIncomeAmountSummaryDto;
  sessionYearTotal: number;
  classMonthlySummaries: StaffIncomeClassSummaryDto[];
  bonusMonthlyTotals: StaffIncomeAmountSummaryDto;
  otherRoleSummaries: StaffIncomeRoleSummaryDto[];
}
