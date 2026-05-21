import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AttendanceStatus } from '../../generated/enums';
import { IsStudentId } from '../common/entity-id.validators';

export class AttendanceCreateDto {
  @ApiProperty({
    description: 'Student id',
    example: 'UNIST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  @IsStudentId()
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
