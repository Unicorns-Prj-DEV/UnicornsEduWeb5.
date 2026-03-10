import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Gender, StudentStatus } from 'generated/enums';

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

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @ApiProperty({ description: 'Student id' })
  @IsUUID()
  id: string;
}
