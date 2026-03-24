import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus, SessionPaymentStatus } from '../../generated/enums';
import { AttendanceCreateDto, AttendanceUpdateDto } from './attendance.dto';

export class SessionCreateDto {
  @ApiProperty({ description: 'Class id', example: 'uuid' })
  @IsUUID()
  classId: string;

  @ApiProperty({ description: 'Teacher id', example: 'uuid' })
  @IsUUID()
  teacherId: string;

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

  @ApiPropertyOptional({
    description: 'Coefficient for this session (e.g. 1.0, 1.5).',
    example: 1.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(9.9)
  coefficient?: number;

  @ApiPropertyOptional({
    description:
      'Allowance amount (VNĐ) for this session. If omitted, uses class teacher custom allowance.',
    example: 120000,
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  allowanceAmount?: number | null;

  @ApiProperty({
    description: 'Attendance items for this session.',
    type: [AttendanceCreateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceCreateDto)
  attendance: AttendanceCreateDto[];
}

export class SessionUpdateDto extends PartialType(SessionCreateDto) {
  @ApiPropertyOptional({ description: 'Session id', example: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'Teacher payment status',
    example: 'unpaid',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  teacherPaymentStatus?: string | null;

  @ApiPropertyOptional({
    description: 'Attendance items for this session.',
    type: [AttendanceUpdateDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceUpdateDto)
  declare attendance?: AttendanceUpdateDto[];
}

export class SessionBulkPaymentStatusUpdateDto {
  @ApiProperty({
    description: 'Danh sách id session cần cập nhật trạng thái thanh toán.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  sessionIds: string[];

  @ApiProperty({
    description: 'Trạng thái thanh toán mới cho các session đã chọn.',
    enum: SessionPaymentStatus,
    example: SessionPaymentStatus.paid,
  })
  @IsEnum(SessionPaymentStatus)
  teacherPaymentStatus: SessionPaymentStatus;
}

export interface SessionBulkPaymentStatusUpdateResult {
  requestedCount: number;
  updatedCount: number;
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
