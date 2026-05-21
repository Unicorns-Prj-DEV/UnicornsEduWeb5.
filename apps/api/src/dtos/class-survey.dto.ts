import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IsStaffId } from '../common/entity-id.validators';

export class CreateClassSurveyDto {
  @ApiProperty({
    description: 'Khảo sát lần mấy.',
    example: 4,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  test_number: number;

  @ApiPropertyOptional({
    description: 'Ngày báo cáo YYYY-MM-DD. Mặc định là ngày hiện tại.',
    example: '2026-05-18',
  })
  @IsOptional()
  @IsDateString()
  report_date?: string;

  @ApiProperty({
    description: 'Staff id của gia sư phụ trách trong lớp.',
    example: 'UNISTAFF-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  @IsStaffId()
  teacher_id: string;

  @ApiProperty({
    description: 'Nội dung báo cáo rich text HTML.',
    example: '<p>Học sinh nắm chắc nội dung tháng này.</p>',
  })
  @IsString()
  content: string;
}

export class UpdateClassSurveyDto extends PartialType(CreateClassSurveyDto) {}
