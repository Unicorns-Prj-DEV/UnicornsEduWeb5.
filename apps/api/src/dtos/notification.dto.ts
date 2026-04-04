import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const NOTIFICATION_STATUSES = ['draft', 'published'] as const;
export const NOTIFICATION_DELIVERY_KINDS = ['published', 'adjusted'] as const;

export type NotificationStatusDto = (typeof NOTIFICATION_STATUSES)[number];
export type NotificationDeliveryKindDto =
  (typeof NOTIFICATION_DELIVERY_KINDS)[number];

export class GetAdminNotificationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter notifications by status.',
    enum: NOTIFICATION_STATUSES,
    example: 'published',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_STATUSES)
  status?: NotificationStatusDto;

  @ApiPropertyOptional({
    description: 'Maximum number of rows returned.',
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  limit?: number;
}

export class GetNotificationFeedQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of published notifications returned.',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification title shown to staff.',
    example: 'Lịch nghỉ lễ 30/4',
    maxLength: 160,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @ApiProperty({
    description: 'Notification body shown to staff.',
    example:
      'Trung tâm nghỉ từ 30/4 đến hết 1/5. Mọi lịch học sẽ dời sang cuối tuần.',
    maxLength: 4000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({
    description: 'Notification title.',
    example: 'Điều chỉnh lịch nghỉ lễ 30/4',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    description: 'Notification body.',
    example: 'Trung tâm nghỉ từ 30/4 đến hết 2/5.',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message?: string;
}

export class PushNotificationDto extends UpdateNotificationDto {}

export interface NotificationAuthorDto {
  userId: string | null;
  accountHandle: string | null;
  email: string | null;
  displayName: string | null;
}

export interface NotificationAdminItemDto {
  id: string;
  title: string;
  message: string;
  status: NotificationStatusDto;
  version: number;
  pushCount: number;
  lastPushedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: NotificationAuthorDto | null;
}

export interface NotificationFeedItemDto {
  id: string;
  title: string;
  message: string;
  status: 'published';
  version: number;
  pushCount: number;
  lastPushedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: NotificationAuthorDto | null;
}

export interface NotificationPushEventDto {
  id: string;
  title: string;
  message: string;
  version: number;
  lastPushedAt: string;
  deliveryKind: NotificationDeliveryKindDto;
}

export interface DeleteNotificationResponseDto {
  id: string;
}
