import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import {
  CurrentUser,
  type JwtPayload,
} from 'src/auth/decorators/current-user.decorator';
import { AllowAssistantOnAdminRoutes } from 'src/auth/decorators/allow-assistant-on-admin.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import {
  type DeleteNotificationResponseDto,
  type NotificationAdminItemDto,
  type NotificationFeedItemDto,
  CreateNotificationDto,
  GetAdminNotificationsQueryDto,
  GetNotificationFeedQueryDto,
  PushNotificationDto,
  UpdateNotificationDto,
} from 'src/dtos/notification.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
@ApiTags('notifications')
@ApiCookieAuth('access_token')
@AllowAssistantOnAdminRoutes(false)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'List notifications for admin management',
    description:
      'Return draft and published notifications so admins can create, edit, push, and delete them.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Optional notification status filter.',
    example: 'draft',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of rows returned.',
    example: 200,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification management list.',
  })
  async getAdminNotifications(
    @Query() query: GetAdminNotificationsQueryDto,
  ): Promise<NotificationAdminItemDto[]> {
    return this.notificationService.getAdminNotifications(query);
  }

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Create a notification draft',
    description:
      'Create a draft notification. Drafts are persisted but not broadcast until pushed.',
  })
  @ApiBody({
    type: CreateNotificationDto,
    description: 'Draft notification payload.',
  })
  @ApiResponse({
    status: 201,
    description: 'Draft notification created.',
  })
  async createNotificationDraft(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateNotificationDto,
  ): Promise<NotificationAdminItemDto> {
    return this.notificationService.createNotificationDraft(data, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Update a notification draft',
    description:
      'Update a draft notification. Published notifications must use push to apply adjustments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification id',
  })
  @ApiBody({
    type: UpdateNotificationDto,
    description: 'Draft fields to update.',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft notification updated.',
  })
  async updateNotificationDraft(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateNotificationDto,
  ): Promise<NotificationAdminItemDto> {
    return this.notificationService.updateNotificationDraft(id, data ?? {}, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Post(':id/push')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Push a notification to all staff',
    description:
      'Publish a draft or apply an adjusted re-push for an already published notification, then broadcast it via websocket.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification id',
  })
  @ApiBody({
    type: PushNotificationDto,
    required: false,
    description:
      'Optional updated title/message applied atomically with the push.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification pushed to all staff.',
  })
  async pushNotification(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: PushNotificationDto,
  ): Promise<NotificationAdminItemDto> {
    return this.notificationService.pushNotification(id, data ?? {}, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Delete a notification',
    description:
      'Delete a draft or published notification. Deletion does not emit a realtime retract event.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification id',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted.',
  })
  async deleteNotification(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DeleteNotificationResponseDto> {
    return this.notificationService.deleteNotification(id, {
      userId: user.id,
      userEmail: user.email,
      roleType: user.roleType,
    });
  }

  @Get('feed')
  @Roles(UserRole.admin, UserRole.staff)
  @ApiOperation({
    summary: 'Get the staff notification feed',
    description:
      'Return published notifications for linked staff profiles. Used by /staff/notification.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of published notifications returned.',
    example: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'Published notification feed.',
  })
  async getNotificationFeed(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetNotificationFeedQueryDto,
  ): Promise<NotificationFeedItemDto[]> {
    return this.notificationService.getNotificationFeed(user, query);
  }
}
