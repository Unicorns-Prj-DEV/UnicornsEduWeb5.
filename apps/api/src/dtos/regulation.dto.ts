import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { RegulationAudience } from 'generated/enums';

export class CreateRegulationDto {
  @ApiProperty({
    description: 'Regulation title shown in the notes workspace.',
    example: 'Quy định nộp bài',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: 'Short summary shown below the title.',
    example: 'Hướng dẫn và thời hạn nộp bài',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    description: 'Rich text HTML content stored from the editor.',
    example: '<p>Học viên cần nộp bài đúng thời hạn.</p>',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({
    description: 'Audience tags that decide who can see the regulation.',
    enum: RegulationAudience,
    isArray: true,
    example: [RegulationAudience.all, RegulationAudience.staff_teacher],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(RegulationAudience, { each: true })
  audiences!: RegulationAudience[];

  @ApiPropertyOptional({
    description: 'Optional attached resource URL displayed above the summary.',
    example: 'https://example.com/quy-dinh-nop-bai',
  })
  @IsOptional()
  @IsUrl()
  resourceLink?: string | null;

  @ApiPropertyOptional({
    description: 'Optional label for the attached resource link.',
    example: 'Mở tài nguyên',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  resourceLinkLabel?: string | null;
}

export class UpdateRegulationDto {
  @ApiPropertyOptional({
    description: 'Regulation title shown in the notes workspace.',
    example: 'Quy định nộp bài',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Short summary shown below the title.',
    example: 'Hướng dẫn và thời hạn nộp bài',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Rich text HTML content stored from the editor.',
    example: '<p>Học viên cần nộp bài đúng thời hạn.</p>',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({
    description: 'Audience tags that decide who can see the regulation.',
    enum: RegulationAudience,
    isArray: true,
    example: [RegulationAudience.all, RegulationAudience.staff_teacher],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(RegulationAudience, { each: true })
  audiences?: RegulationAudience[];

  @ApiPropertyOptional({
    description: 'Optional attached resource URL displayed above the summary.',
    example: 'https://example.com/quy-dinh-nop-bai',
  })
  @IsOptional()
  @IsUrl()
  resourceLink?: string | null;

  @ApiPropertyOptional({
    description: 'Optional label for the attached resource link.',
    example: 'Mở tài nguyên',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  resourceLinkLabel?: string | null;
}

export interface RegulationAuthorDto {
  userId: string | null;
  accountHandle: string | null;
  email: string | null;
  displayName: string | null;
}

export interface RegulationItemDto {
  id: string;
  title: string;
  description: string | null;
  content: string;
  audiences: RegulationAudience[];
  resourceLink: string | null;
  resourceLinkLabel: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: RegulationAuthorDto | null;
  updatedBy: RegulationAuthorDto | null;
}
