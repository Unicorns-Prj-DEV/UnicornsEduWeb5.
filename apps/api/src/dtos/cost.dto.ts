import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentStatus } from 'generated/enums';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCostDto {
  @ApiProperty({ description: 'Cost id' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ example: '2026-03' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ example: 'Marketing' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  amount?: number;

  @ApiPropertyOptional({ example: '2026-03-13' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.pending })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}

export class UpdateCostDto extends PartialType(CreateCostDto) {
  @ApiProperty({ description: 'Cost id' })
  @IsUUID()
  id: string;
}
