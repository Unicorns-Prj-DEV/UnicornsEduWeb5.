import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Gender, StudentStatus } from 'generated/enums';
import { PaginationQueryDto } from './pagination.dto';

export class SearchAssignableStudentUsersDto {
  @ApiProperty({
    description: 'Full or partial email to search existing users',
    example: 'student@example.com',
  })
  @IsString()
  @MinLength(2)
  email: string;
}

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

  @ApiPropertyOptional({
    example: '20bf3b10-a7a1-43da-bbd2-f7a1d55b5ca7',
    description: 'Assigned customer care staff ID. Set null to clear.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  customer_care_staff_id?: string | null;

  @ApiPropertyOptional({
    example: 0.2,
    description:
      'Customer care profit coefficient stored in CustomerCareService (0.00 - 0.99).',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(0.99)
  customer_care_profit_percent?: number | null;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'Nguyễn Văn B' })
  @IsString()
  full_name: string;

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

  @ApiProperty({
    description:
      'Signed balance delta. Use a positive number to top up and a negative number to reduce balance.',
    example: 500000,
  })
  @Type(() => Number)
  @IsNumber()
  amount: number;
}

export class UpdateMyStudentAccountBalanceDto {
  @ApiProperty({
    description:
      'Signed balance delta for the current authenticated student. Use a positive number to top up and a negative number to withdraw.',
    example: 500000,
  })
  @Type(() => Number)
  @IsNumber()
  amount: number;
}

export class StudentWalletHistoryQueryDto {
  @ApiPropertyOptional({
    example: 50,
    minimum: 1,
    maximum: 200,
    default: 50,
    description: 'Maximum number of wallet transactions to return.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
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
