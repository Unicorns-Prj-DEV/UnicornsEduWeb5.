import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

function normalizeNullableString(value: unknown): unknown {
  return value === undefined ? null : value;
}

export class SePayWebhookDto {
  @ApiProperty({ description: 'SePay transaction ID', example: 92704 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty({
    description: 'Bank gateway brand name',
    example: 'Vietcombank',
  })
  @IsString()
  @IsNotEmpty()
  gateway!: string;

  @ApiProperty({
    description: 'Bank-side transaction time',
    example: '2023-03-25 14:02:37',
  })
  @IsString()
  @IsNotEmpty()
  transactionDate!: string;

  @ApiProperty({ description: 'Receiving bank account number' })
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @ApiPropertyOptional({
    description:
      'Payment code detected by SePay. Null when SePay cannot detect it.',
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) => normalizeNullableString(value))
  @IsOptional()
  @IsString()
  code!: string | null;

  @ApiProperty({ description: 'Bank transfer content' })
  @IsString()
  content!: string;

  @ApiProperty({
    description: 'Transaction direction: in = incoming, out = outgoing',
    enum: ['in', 'out'],
  })
  @IsIn(['in', 'out'])
  transferType!: 'in' | 'out';

  @ApiProperty({ description: 'Transaction amount in VND', example: 2277000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  transferAmount!: number;

  @ApiProperty({ description: 'Account balance after transaction' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  accumulated!: number;

  @ApiPropertyOptional({
    description: 'Sub account / virtual account, when present',
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) => normalizeNullableString(value))
  @IsOptional()
  @IsString()
  subAccount!: string | null;

  @ApiProperty({ description: 'SMS/reference code from bank message' })
  @IsString()
  @IsNotEmpty()
  referenceCode!: string;

  @ApiProperty({ description: 'Full SMS/bank description. May be empty.' })
  @IsString()
  description!: string;
}
