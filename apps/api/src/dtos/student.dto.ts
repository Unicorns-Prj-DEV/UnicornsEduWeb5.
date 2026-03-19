import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Gender, StudentStatus } from 'generated/enums';
import { PaginationQueryDto } from './pagination.dto';

export class StudentListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'Nguyễn',
    description: 'Search by student full name (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'THPT ABC',
    description: 'Filter by school name (contains, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({
    example: 'TP.HCM',
    description: 'Filter by province (contains, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    enum: StudentStatus,
    description: 'Filter by student status',
  })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({
    enum: Gender,
    description: 'Filter by gender',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    example: 'Toán 8A',
    description: 'Filter by class name (contains, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  className?: string;
}

export class UpdateStudentBodyDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn B' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'THPT ABC' })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional({ example: 'TP.HCM' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 2010 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  birth_year?: number;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  parent_name?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  parent_phone?: string;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Đạt IELTS 7.0' })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  drop_out_date?: string;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'Nguyễn Văn B' })
  @IsString()
  full_name: string;

  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'THPT ABC' })
  @IsString()
  school: string;

  @ApiProperty({ example: 'TP.HCM' })
  @IsString()
  province: string;

  @ApiProperty({ example: 2010 })
  @IsInt()
  @Min(1900)
  birth_year: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  parent_name: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  parent_phone: string;

  @ApiProperty({ enum: StudentStatus })
  @IsEnum(StudentStatus)
  status: StudentStatus;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 'Đạt IELTS 7.0' })
  @IsString()
  goal: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  drop_out_date?: string;

  @ApiProperty({ description: 'User id' })
  @IsUUID()
  user_id: string;
}

export class UpdateStudentDto extends UpdateStudentBodyDto {
  @ApiProperty({ description: 'Student id' })
  @IsUUID()
  id: string;
}

export class UpdateStudentAccountBalanceCreateDto {
  @ApiProperty({ description: 'Student id' })
  @IsUUID()
  student_id: string;

  @ApiProperty({ description: 'Amount' })
  @IsNumber()
  amount: number;
}

export class UpdateStudentClassesDto {
  @ApiProperty({
    description:
      'Class ids assigned to the student. Replaces current memberships.',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  class_ids: string[];
}
