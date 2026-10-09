import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Audio gắn vào câu / tư liệu dùng chung. `url` là signed URL ngắn hạn (null khi storage lỗi). */
export interface AudioRefDto {
  id: string;
  originalName: string;
  url: string | null;
}

export class UploadAudioDto {
  @ApiProperty({ description: 'Khoá học sở hữu audio (ngân hàng câu hỏi)' })
  @IsUUID()
  courseId: string;
}
