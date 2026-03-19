import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AttendanceStatus } from 'generated/enums';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { AttendanceCreateDto, AttendanceUpdateDto } from './attendance.dto';

export interface SessionCreateDto {
  classId: string;
  teacherId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  /** Coefficient for this session (e.g. 1.0, 1.5). Default 1.0. */
  coefficient?: number;
  /** Allowance amount (VNĐ) for this session. If omitted, uses class teacher custom allowance. */
  allowanceAmount?: number | null;
  attendance: AttendanceCreateDto[];
}

export interface SessionUpdateDto {
  id?: string;
  classId?: string;
  teacherId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
  teacherPaymentStatus?: string | null;
  /** Coefficient for this session (e.g. 1.0, 1.5). */
  coefficient?: number;
  /** Allowance amount (VNĐ) for this session. */
  allowanceAmount?: number | null;
  attendance?: AttendanceUpdateDto[];
}

export interface SessionUnpaidSummaryItem {
  classId: string;
  className: string;
  totalAllowance: number | string;
}

export class StaffOpsAttendanceDto {
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
}

export class CreateStaffOpsSessionDto {
  @ApiProperty({
    description: 'Session date YYYY-MM-DD',
    example: '2026-03-18',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must use YYYY-MM-DD format',
  })
  date: string;

  @ApiPropertyOptional({
    description: 'Start time HH:mm or HH:mm:ss',
    example: '19:00:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, {
    message: 'startTime must use HH:mm or HH:mm:ss format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time HH:mm or HH:mm:ss',
    example: '20:30:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, {
    message: 'endTime must use HH:mm or HH:mm:ss format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Session note (HTML/plain text accepted).',
  })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({
    description: 'Attendance items without financial overrides.',
    type: [StaffOpsAttendanceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffOpsAttendanceDto)
  attendance: StaffOpsAttendanceDto[];
}

export class UpdateStaffOpsSessionDto extends PartialType(
  CreateStaffOpsSessionDto,
) {}
