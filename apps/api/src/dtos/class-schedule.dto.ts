import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ClassScheduleEntryDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for this schedule entry',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description:
      'Day of week (0=Chủ Nhật, 1=Thứ Hai, 2=Thứ Ba, 3=Thứ Tư, 4=Thứ Năm, 5=Thứ Sáu, 6=Thứ Bảy)',
    example: 1,
  })
  @IsInt()
  @IsIn([0, 1, 2, 3, 4, 5, 6])
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm or HH:mm:ss format',
    example: '19:00',
  })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'from must be in HH:mm or HH:mm:ss format',
  })
  from: string;

  @ApiProperty({
    description: 'End time in HH:mm or HH:mm:ss format',
    example: '20:30',
  })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'end must be in HH:mm or HH:mm:ss format',
  })
  end: string;

  @ApiPropertyOptional({
    description: 'Responsible tutor for this weekly schedule entry',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Google Calendar recurring event ID (auto-synced)',
    example: 'abc123 recurring event id from google',
  })
  @IsOptional()
  @IsString()
  googleCalendarEventId?: string;

  @ApiPropertyOptional({
    description: 'Google Meet link for this recurring schedule (auto-synced)',
    example: 'https://meet.google.com/xxx-yyy-zzz',
  })
  @IsOptional()
  @IsString()
  meetLink?: string;
}

export class ClassSchedulePatternDto {
  @ApiProperty({
    description: 'Class schedule entries (weekly recurrence pattern)',
    type: [ClassScheduleEntryDto],
    example: [
      { dayOfWeek: 1, from: '19:00', end: '20:30' },
      { dayOfWeek: 3, from: '19:00', end: '20:30' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassScheduleEntryDto)
  schedule: ClassScheduleEntryDto[];
}

export class ClassScheduleEventDto {
  @ApiProperty({
    description: 'Unique occurrence ID (e.g., classId + entryId + date)',
    example: 'classId-entryId-2026-04-15',
  })
  @IsString()
  occurrenceId: string;

  @ApiProperty({
    description: 'Class ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  classId: string;

  @ApiProperty({ description: 'Class name', example: 'Lớp Toán 10A' })
  @IsString()
  className: string;

  @ApiProperty({
    description: 'Teacher IDs assigned to this class schedule occurrence',
    example: ['660e8400-e29b-41d4-a716-446655440001'],
    type: [String],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  teacherIds: string[];

  @ApiProperty({
    description: 'Teacher full names assigned to this class schedule occurrence',
    example: ['Nguyễn Văn An'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  teacherNames: string[];

  @ApiProperty({
    description: 'Session date in YYYY-MM-DD format',
    example: '2026-04-15',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must use YYYY-MM-DD format',
  })
  date: string;

  @ApiPropertyOptional({
    description: 'Session start time in HH:mm:ss format',
    example: '19:00:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'startTime must be in HH:mm:ss format',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Session end time in HH:mm:ss format',
    example: '20:30:00',
  })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'endTime must be in HH:mm:ss format',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description:
      'ID of the pattern entry this occurrence derives from',
    example: 'entry-uuid',
  })
  @IsOptional()
  @IsString()
  patternEntryId?: string;

  @ApiPropertyOptional({
    description: 'Google Meet link from the corresponding session (if exists)',
    example: 'https://meet.google.com/xxx-yyy-zzz',
  })
  @IsOptional()
  @IsString()
  meetLink?: string;
}

export class ClassScheduleFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by class ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filter by teacher ID (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2026-04-01',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must use YYYY-MM-DD format',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2026-04-30',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must use YYYY-MM-DD format',
  })
  endDate: string;
}

