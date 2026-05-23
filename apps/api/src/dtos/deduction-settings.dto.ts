import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StaffRole } from 'generated/enums';
import {
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsStaffId } from '../common/entity-id.validators';

export class TaxDeductionSettingsQueryDto {
  @ApiPropertyOptional({
    description:
      'Date used to resolve the current effective rates (defaults to today).',
    example: '2026-04-14',
  })
  @IsOptional()
  @IsDateString()
  asOfDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by staff role type.',
    enum: StaffRole,
  })
  @IsOptional()
  @IsEnum(StaffRole)
  roleType?: StaffRole;

  @ApiPropertyOptional({
    description: 'Filter staff overrides by a specific staff id.',
    example: 'UNISTAFF-c3d4e5f6a7',
  })
  @IsOptional()
  @IsStaffId()
  staffId?: string;
}

export class CreateRoleTaxDeductionRateDto {
  @ApiProperty({
    description: 'Staff role type that this default tax rate applies to.',
    enum: StaffRole,
  })
  @IsEnum(StaffRole)
  roleType: StaffRole;

  @ApiProperty({
    description: 'Tax deduction rate percent.',
    minimum: 0,
    maximum: 100,
    example: 10,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent: number;

  @ApiProperty({
    description: 'Effective date for this role default tax rate.',
    example: '2026-04-14',
  })
  @IsDateString()
  effectiveFrom: string;
}

export class UpdateRoleTaxDeductionRateDto {
  @ApiProperty({
    description: 'Updated tax deduction rate percent.',
    minimum: 0,
    maximum: 100,
    example: 12.5,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent: number;

  @ApiProperty({
    description: 'Updated effective date for this role default tax rate.',
    example: '2026-04-14',
  })
  @IsDateString()
  effectiveFrom: string;
}

export class CreateStaffTaxDeductionOverrideDto {
  @ApiProperty({
    description: 'Staff id this override applies to.',
    example: 'UNISTAFF-c3d4e5f6a7',
  })
  @IsStaffId()
  staffId: string;

  @ApiProperty({
    description: 'Staff role type this override applies to.',
    enum: StaffRole,
  })
  @IsEnum(StaffRole)
  roleType: StaffRole;

  @ApiProperty({
    description: 'Tax deduction rate percent.',
    minimum: 0,
    maximum: 100,
    example: 8.5,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent: number;

  @ApiProperty({
    description: 'Effective date for this staff override tax rate.',
    example: '2026-04-14',
  })
  @IsDateString()
  effectiveFrom: string;
}

export class UpdateStaffTaxDeductionOverrideDto {
  @ApiProperty({
    description: 'Updated tax deduction rate percent.',
    minimum: 0,
    maximum: 100,
    example: 8.5,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent: number;

  @ApiProperty({
    description: 'Updated effective date for this override.',
    example: '2026-04-14',
  })
  @IsDateString()
  effectiveFrom: string;
}

export class BulkUpsertStaffTaxDeductionOverrideItemDto {
  @ApiPropertyOptional({
    description:
      'Existing staff override id. If provided, API updates this row; otherwise it creates a new override row.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  overrideId?: string;

  @ApiProperty({
    description: 'Staff role type this override applies to.',
    enum: StaffRole,
  })
  @IsEnum(StaffRole)
  roleType: StaffRole;

  @ApiProperty({
    description: 'Tax deduction rate percent.',
    minimum: 0,
    maximum: 100,
    example: 8.5,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ratePercent: number;

  @ApiProperty({
    description: 'Effective date for this override.',
    example: '2026-04-14',
  })
  @IsDateString()
  effectiveFrom: string;
}

export class BulkUpsertStaffTaxDeductionOverridesDto {
  @ApiProperty({
    description: 'Staff id this bulk upsert applies to.',
    example: 'UNISTAFF-c3d4e5f6a7',
  })
  @IsStaffId()
  staffId: string;

  @ApiProperty({
    description:
      'List of role-level override items to create/update in a single request.',
    type: BulkUpsertStaffTaxDeductionOverrideItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertStaffTaxDeductionOverrideItemDto)
  items: BulkUpsertStaffTaxDeductionOverrideItemDto[];
}
