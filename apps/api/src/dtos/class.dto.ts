import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
} from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ description: 'Class id' })
  @IsUUID()
  id: string;

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
        day: 'monday',
        start_time: '19:00',
        end_time: '20:30',
      },
    ],
    description: 'Class schedule JSON array',
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
}

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @ApiProperty({ description: 'Class id' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({
    description: 'Staff ids (gia sư phụ trách). Sync replaces current list.',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  teacher_ids?: string[];
}
