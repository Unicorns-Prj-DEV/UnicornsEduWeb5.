import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentStatus, StaffRole } from 'generated/enums';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class CreateExtraAllowanceDto {
  @ApiProperty({ description: 'Extra allowance id' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Staff id' })
  @IsUUID()
  staffId: string;

  @ApiProperty({
    description: 'Month key in format YYYY-MM',
    example: '2026-03',
  })
  @Matches(MONTH_KEY_PATTERN, {
    message: 'month must be in YYYY-MM format',
  })
  month: string;

  @ApiPropertyOptional({ example: 500000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  amount?: number;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    default: PaymentStatus.pending,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    example: 'Hỗ trợ thêm cho khối admin tháng 3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiProperty({
    enum: StaffRole,
    default: StaffRole.teacher,
    description: 'Staff role this allowance belongs to.',
  })
  @IsEnum(StaffRole)
  roleType: StaffRole;
}

export class UpdateExtraAllowanceDto extends PartialType(
  CreateExtraAllowanceDto,
) {
  @ApiProperty({ description: 'Extra allowance id' })
  @IsUUID()
  id: string;
}

export class ExtraAllowanceBulkStatusUpdateDto {
  @ApiProperty({
    description: 'Danh sách id trợ cấp thêm cần cập nhật trạng thái.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  allowanceIds: string[];

  @ApiProperty({
    description: 'Trạng thái thanh toán mới cho các khoản trợ cấp thêm.',
    enum: PaymentStatus,
    example: PaymentStatus.paid,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

export interface ExtraAllowanceBulkStatusUpdateResult {
  requestedCount: number;
  updatedCount: number;
}

/** Self-service: staff with role `communication` creates their own communication allowance (always pending). */
export class CreateMyCommunicationExtraAllowanceDto {
  @ApiProperty({ description: 'Client-generated UUID for the new record' })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Month key in format YYYY-MM',
    example: '2026-03',
  })
  @Matches(MONTH_KEY_PATTERN, {
    message: 'month must be in YYYY-MM format',
  })
  month: string;

  @ApiPropertyOptional({ example: 500000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  amount?: number;

  @ApiPropertyOptional({
    example: 'Hỗ trợ truyền thông tháng 3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
