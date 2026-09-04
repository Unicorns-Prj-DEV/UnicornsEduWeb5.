import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TopicCreateDto {
  @ApiProperty({
    description: 'Tiêu đề chuyên đề',
    example: 'Chuyên đề Đại số tuyến tính',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Link video YouTube nhúng',
    example: 'https://youtube.com/watch?v=abc123',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung chuyên đề (HTML rich text)',
    example: '<p>Nội dung bài học...</p>',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  content?: string | null;
}

export class TopicUpdateDto {
  @ApiPropertyOptional({ description: 'Tiêu đề chuyên đề' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Link video YouTube nhúng',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung chuyên đề (HTML rich text)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  content?: string | null;
}

export interface TopicResponseDto {
  id: string;
  classId: string;
  title: string;
  videoUrl: string | null;
  content: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
