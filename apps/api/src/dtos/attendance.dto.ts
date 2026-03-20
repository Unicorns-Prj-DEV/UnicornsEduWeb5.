import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AttendanceStatus } from '../../generated/enums';

export class AttendanceCreateDto {
  @ApiProperty({ description: 'Student id', example: 'uuid' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.present })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({
    description: 'Attendance note',
    example: 'Đi trễ 10 phút.',
  })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Tuition fee override for this attendance item (VNĐ).',
    example: 180000,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  tuitionFee?: number | null;
}

export class AttendanceUpdateDto extends AttendanceCreateDto {}
