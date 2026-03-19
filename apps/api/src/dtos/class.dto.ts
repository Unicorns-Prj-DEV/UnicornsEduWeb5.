import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { ClassStatus, ClassType } from 'generated/enums';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ClassTeacherItemDto {
  @ApiProperty({ description: 'Teacher (staff) id', example: 'uuid' })
  @IsUUID()
  teacher_id: string;

  @ApiPropertyOptional({
    description: 'Custom allowance for this teacher in this class (VNĐ)',
    example: 150000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  custom_allowance?: number;
}

export class CreateClassDto {
  @ApiProperty({ example: 'Math 10A' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ClassType, default: ClassType.basic })
  @IsOptional()
  @IsEnum(ClassType)
  type?: ClassType;

  @ApiPropertyOptional({ enum: ClassStatus, default: ClassStatus.running })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @ApiPropertyOptional({ example: 15, minimum: 1, default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_students?: number;

  @ApiPropertyOptional({ example: 120000, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  allowance_per_session_per_student?: number;

  @ApiPropertyOptional({ example: 200000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  max_allowance_per_session?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  scale_amount?: number;

  @ApiPropertyOptional({
    example: [
      {
        from: '19:00:00',
        to: '20:30:00',
      },
    ],
    description: 'Class schedule JSON array in { from, to } format',
  })
  @IsOptional()
  @IsArray()
  schedule?: unknown[];

  @ApiPropertyOptional({ example: 300000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  student_tuition_per_session?: number;

  @ApiPropertyOptional({ example: 3600000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tuition_package_total?: number;

  @ApiPropertyOptional({ example: 12, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tuition_package_session?: number;

  @ApiPropertyOptional({
    description:
      'Staff ids (gia sư phụ trách). Ignored if teachers[] is provided.',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teacher_ids?: string[];

  @ApiPropertyOptional({
    description:
      'Teachers with optional custom allowance per teacher. Takes precedence over teacher_ids.',
    type: [ClassTeacherItemDto],
    example: [{ teacher_id: 'uuid-1', custom_allowance: 150000 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTeacherItemDto)
  teachers?: ClassTeacherItemDto[];

  @ApiPropertyOptional({
    description: 'Student ids (học sinh trong lớp).',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  student_ids?: string[];
}

/** DTO for PATCH /class/:id/basic-info – basic info + tuition only */
export class UpdateClassBasicInfoDto extends PartialType(
  PickType(CreateClassDto, [
    'name',
    'type',
    'status',
    'max_students',
    'allowance_per_session_per_student',
    'max_allowance_per_session',
    'scale_amount',
    'student_tuition_per_session',
    'tuition_package_total',
    'tuition_package_session',
  ]),
) {}

/** DTO for PATCH /class/:id/teachers – replace teachers list */
export class UpdateClassTeachersDto {
  @ApiProperty({
    description:
      'Teachers with optional custom allowance. Replaces current list.',
    type: [ClassTeacherItemDto],
    example: [{ teacher_id: 'uuid-1', custom_allowance: 150000 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTeacherItemDto)
  teachers: ClassTeacherItemDto[];
}

/** Schedule slot for UpdateClassScheduleDto */
export class ScheduleSlotDto {
  @ApiProperty({ description: 'Start time HH:mm:ss', example: '19:00:00' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'End time HH:mm:ss', example: '20:30:00' })
  @IsString()
  to: string;
}

/** DTO for PATCH /class/:id/schedule – replace schedule */
export class UpdateClassScheduleDto {
  @ApiProperty({
    description: 'Class schedule array { from, to } in HH:mm:ss',
    type: [ScheduleSlotDto],
    example: [{ from: '19:00:00', to: '20:30:00' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule: ScheduleSlotDto[];
}

/** DTO for POST /staff-ops/classes – minimal class metadata only */
export class CreateStaffOpsClassDto extends PickType(CreateClassDto, [
  'name',
  'type',
  'status',
] as const) {
  @ApiPropertyOptional({
    description: 'Class schedule array { from, to } in HH:mm:ss',
    type: [ScheduleSlotDto],
    example: [{ from: '19:00:00', to: '20:30:00' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule?: ScheduleSlotDto[];
}

export class StudentClassCreateDto {
  @ApiProperty({ description: 'Student id', example: 'uuid' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ example: 300000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  custom_tuition_per_session?: number;

  @ApiPropertyOptional({ example: 3600000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  custom_tuition_package_total?: number;

  @ApiPropertyOptional({ example: 12, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  custom_tuition_package_session?: number;
}

/** DTO for PATCH /class/:id/students – replace students list */
export class UpdateClassStudentsDto {
  @ApiProperty({
    description:
      'Student memberships in the class. Replaces current list and lets backend derive effective tuition overrides.',
    type: [StudentClassCreateDto],
    example: [{ id: 'uuid-1', custom_tuition_package_total: 3600000 }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentClassCreateDto)
  students: StudentClassCreateDto[];
}

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @ApiProperty({ description: 'Class id' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({
    description:
      'Staff ids (gia sư phụ trách). Ignored if teachers[] is provided.',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teacher_ids?: string[];

  @ApiPropertyOptional({
    description:
      'Teachers with optional custom allowance. Sync replaces current list. Takes precedence over teacher_ids.',
    type: [ClassTeacherItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassTeacherItemDto)
  teachers?: ClassTeacherItemDto[];

  @ApiPropertyOptional({
    description:
      'Student ids (học sinh trong lớp). Sync replaces current list.',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  student_ids?: string[];
}
