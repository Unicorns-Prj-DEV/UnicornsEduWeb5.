import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { AudioRefDto } from './audio-asset.dto';

export const SHARED_MATERIAL_TITLE_MAX = 200;

export interface SharedMaterialResponseDto {
  id: string;
  courseId: string;
  title: string;
  /** HTML (đoạn văn, ảnh). */
  content: string;
  /** Số câu (chưa xoá) đang gắn tư liệu. */
  questionCount: number;
  /** Audio dùng chung (JP), vd bài nghe cho cả nhóm câu. */
  audioId: string | null;
  audio: AudioRefDto | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SharedMaterialFilterDto {
  @ApiProperty({ description: 'Khoá học (ngân hàng câu hỏi)' })
  @IsUUID()
  courseId: string;
}

export class CreateSharedMaterialDto {
  @ApiProperty({ description: 'Khoá học sở hữu tư liệu' })
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Tên ngắn để người soạn nhận ra (học sinh không thấy)',
    example: 'Bài đọc: お花見',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHARED_MATERIAL_TITLE_MAX)
  title: string;

  @ApiProperty({ description: 'Nội dung tư liệu (HTML từ TipTap: đoạn văn, ảnh)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description:
      'Audio dùng chung (JP) — id từ POST /audio-assets, cùng khoá. null = gỡ audio.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  audioId?: string | null;
}

export class UpdateSharedMaterialDto {
  @ApiPropertyOptional({ description: 'Tên ngắn' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SHARED_MATERIAL_TITLE_MAX)
  title?: string;

  @ApiPropertyOptional({
    description:
      'Nội dung (HTML). Bài làm đã bắt đầu giữ bản chụp lúc start, không đổi theo.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({
    description:
      'Audio dùng chung (JP) — id từ POST /audio-assets, cùng khoá. null = gỡ audio.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  audioId?: string | null;
}
