import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAchievementDto {
  @ApiProperty({
    description: 'Achievement title (no hard length limit)',
    example: 'HCV Olympic 30/4',
  })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiPropertyOptional({
    description: 'Display order (lower first). Defaults to end of list.',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {}

export class ReorderAchievementsDto {
  @ApiProperty({
    description: 'Achievement ids in the desired display order (first = 0)',
    type: [String],
    example: [
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  orderedIds: string[];
}

export class AchievementDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ example: 'HCV Olympic 30/4' })
  title: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Storage path inside the achievements bucket',
  })
  imagePath: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Signed URL for the proof image (null when no image)',
  })
  imageUrl: string | null;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
