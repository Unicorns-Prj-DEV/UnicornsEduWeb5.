import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';

export class ActionHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by entity type.',
    example: 'session',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filter by action type.',
    enum: ['create', 'update', 'delete'],
    example: 'update',
  })
  @IsOptional()
  @IsIn(['create', 'update', 'delete'])
  actionType?: 'create' | 'update' | 'delete';

  @ApiPropertyOptional({
    description: 'Filter by exact entity id.',
    example: '97b2dbfc-f6bb-4b2f-bd36-46e820f6f4c8',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by exact actor user id.',
    example: '97b2dbfc-f6bb-4b2f-bd36-46e820f6f4c8',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (inclusive), YYYY-MM-DD.',
    example: '2026-03-01',
  })
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (inclusive), YYYY-MM-DD.',
    example: '2026-03-20',
  })
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  endDate?: string;
}
