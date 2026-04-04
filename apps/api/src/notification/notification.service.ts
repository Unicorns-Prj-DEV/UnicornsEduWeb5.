import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayload } from 'src/auth/decorators/current-user.decorator';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from 'src/action-history/action-history.service';
import {
  type DeleteNotificationResponseDto,
  type GetAdminNotificationsQueryDto,
  type GetNotificationFeedQueryDto,
  type NotificationAdminItemDto,
  type NotificationAuthorDto,
  type NotificationFeedItemDto,
  type NotificationPushEventDto,
  PushNotificationDto,
  UpdateNotificationDto,
  CreateNotificationDto,
} from 'src/dtos/notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationStatus, StaffStatus, UserRole } from 'generated/enums';
import { Prisma } from 'generated/client';
import { NotificationGateway } from './notification.gateway';

const NOTIFICATION_RECORD_INCLUDE = {
  createdBy: {
    select: {
      id: true,
      email: true,
      accountHandle: true,
      first_name: true,
      last_name: true,
    },
  },
} satisfies Prisma.NotificationInclude;

type NotificationAuditClient = Prisma.TransactionClient | PrismaService;
type NotificationRecord = Prisma.NotificationGetPayload<{
  include: typeof NOTIFICATION_RECORD_INCLUDE;
}>;

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async getAdminNotifications(
    query: GetAdminNotificationsQueryDto,
  ): Promise<NotificationAdminItemDto[]> {
    const limit =
      typeof query.limit === 'number'
        ? Math.min(Math.max(query.limit, 1), 300)
        : 200;
    const where: Prisma.NotificationWhereInput = query.status
      ? { status: query.status }
      : {};

    const notifications = await this.prisma.notification.findMany({
      where,
      take: limit,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: NOTIFICATION_RECORD_INCLUDE,
    });

    return notifications.map((notification) =>
      this.mapNotificationAdminItem(notification),
    );
  }

  async createNotificationDraft(
    data: CreateNotificationDto,
    actor: ActionHistoryActor & { userId: string },
  ): Promise<NotificationAdminItemDto> {
    const title = this.normalizeRequiredText(data.title, 'title');
    const message = this.normalizeRequiredText(data.message, 'message');

    return this.prisma.$transaction(async (tx) => {
      const createdNotification = await tx.notification.create({
        data: {
          title,
          message,
          createdByUserId: actor.userId,
        },
        include: NOTIFICATION_RECORD_INCLUDE,
      });

      await this.actionHistoryService.recordCreate(tx, {
        actor,
        entityType: 'notification',
        entityId: createdNotification.id,
        description: 'Tạo thông báo nháp',
        afterValue: createdNotification,
      });

      return this.mapNotificationAdminItem(createdNotification);
    });
  }

  async updateNotificationDraft(
    id: string,
    data: UpdateNotificationDto,
    actor: ActionHistoryActor,
  ): Promise<NotificationAdminItemDto> {
    const existingNotification = await this.getNotificationRecord(
      this.prisma,
      id,
    );

    if (!existingNotification) {
      throw new NotFoundException('Notification not found');
    }

    if (existingNotification.status !== NotificationStatus.draft) {
      throw new BadRequestException(
        'Published notifications must use the push endpoint to apply changes.',
      );
    }

    const updateData = this.buildUpdateData(data);

    if (Object.keys(updateData).length === 0) {
      return this.mapNotificationAdminItem(existingNotification);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedNotification = await tx.notification.update({
        where: { id },
        data: updateData,
        include: NOTIFICATION_RECORD_INCLUDE,
      });

      await this.actionHistoryService.recordUpdate(tx, {
        actor,
        entityType: 'notification',
        entityId: id,
        description: 'Cập nhật thông báo nháp',
        beforeValue: existingNotification,
        afterValue: updatedNotification,
      });

      return this.mapNotificationAdminItem(updatedNotification);
    });
  }

  async pushNotification(
    id: string,
    data: PushNotificationDto,
    actor: ActionHistoryActor,
  ): Promise<NotificationAdminItemDto> {
    const existingNotification = await this.getNotificationRecord(
      this.prisma,
      id,
    );

    if (!existingNotification) {
      throw new NotFoundException('Notification not found');
    }

    const title = data.title
      ? this.normalizeRequiredText(data.title, 'title')
      : existingNotification.title;
    const message = data.message
      ? this.normalizeRequiredText(data.message, 'message')
      : existingNotification.message;
    const isFirstPublish =
      existingNotification.status === NotificationStatus.draft;
    const lastPushedAt = new Date();

    const updatedNotification = await this.prisma.$transaction(async (tx) => {
      const nextNotification = await tx.notification.update({
        where: { id },
        data: {
          title,
          message,
          status: NotificationStatus.published,
          version: isFirstPublish ? 1 : existingNotification.version + 1,
          pushCount: existingNotification.pushCount + 1,
          lastPushedAt,
        },
        include: NOTIFICATION_RECORD_INCLUDE,
      });

      await this.actionHistoryService.recordUpdate(tx, {
        actor,
        entityType: 'notification',
        entityId: id,
        description: isFirstPublish
          ? 'Phát thông báo'
          : 'Điều chỉnh và phát lại thông báo',
        beforeValue: existingNotification,
        afterValue: nextNotification,
      });

      return nextNotification;
    });

    this.notificationGateway.emitNotificationPushed(
      this.mapNotificationPushEvent(updatedNotification, isFirstPublish),
    );

    return this.mapNotificationAdminItem(updatedNotification);
  }

  async deleteNotification(
    id: string,
    actor: ActionHistoryActor,
  ): Promise<DeleteNotificationResponseDto> {
    const existingNotification = await this.getNotificationRecord(
      this.prisma,
      id,
    );

    if (!existingNotification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.notification.delete({
        where: { id },
      });

      await this.actionHistoryService.recordDelete(tx, {
        actor,
        entityType: 'notification',
        entityId: id,
        description:
          existingNotification.status === NotificationStatus.draft
            ? 'Xóa thông báo nháp'
            : 'Xóa thông báo đã phát',
        beforeValue: existingNotification,
      });
    });

    return { id };
  }

  async getNotificationFeed(
    actor: JwtPayload,
    query: GetNotificationFeedQueryDto,
  ): Promise<NotificationFeedItemDto[]> {
    await this.assertStaffFeedAccess(actor);

    const limit =
      typeof query.limit === 'number'
        ? Math.min(Math.max(query.limit, 1), 200)
        : 100;

    const notifications = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.published,
      },
      take: limit,
      orderBy: [{ lastPushedAt: 'desc' }, { updatedAt: 'desc' }],
      include: NOTIFICATION_RECORD_INCLUDE,
    });

    return notifications
      .filter((notification) => Boolean(notification.lastPushedAt))
      .map((notification) => this.mapNotificationFeedItem(notification));
  }

  private async assertStaffFeedAccess(actor: JwtPayload) {
    if (
      actor.roleType !== UserRole.staff &&
      actor.roleType !== UserRole.admin
    ) {
      throw new ForbiddenException('Only staff profiles can access the feed');
    }

    const staff = await this.prisma.staffInfo.findUnique({
      where: { userId: actor.id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!staff || staff.status !== StaffStatus.active) {
      throw new ForbiddenException('Staff profile is not available');
    }
  }

  private buildUpdateData(
    data: UpdateNotificationDto | PushNotificationDto,
  ): Prisma.NotificationUpdateInput {
    const updateData: Prisma.NotificationUpdateInput = {};

    if (data.title !== undefined) {
      updateData.title = this.normalizeRequiredText(data.title, 'title');
    }

    if (data.message !== undefined) {
      updateData.message = this.normalizeRequiredText(data.message, 'message');
    }

    return updateData;
  }

  private normalizeRequiredText(value: string, fieldName: string) {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} must not be empty.`);
    }

    return normalizedValue;
  }

  private getNotificationRecord(db: NotificationAuditClient, id: string) {
    return db.notification.findUnique({
      where: { id },
      include: NOTIFICATION_RECORD_INCLUDE,
    });
  }

  private mapNotificationAdminItem(
    notification: NotificationRecord,
  ): NotificationAdminItemDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      status: notification.status,
      version: notification.version,
      pushCount: notification.pushCount,
      lastPushedAt: notification.lastPushedAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
      createdBy: this.mapNotificationAuthor(notification.createdBy),
    };
  }

  private mapNotificationFeedItem(
    notification: NotificationRecord,
  ): NotificationFeedItemDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      status: 'published',
      version: notification.version,
      pushCount: notification.pushCount,
      lastPushedAt: notification.lastPushedAt!.toISOString(),
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
      createdBy: this.mapNotificationAuthor(notification.createdBy),
    };
  }

  private mapNotificationPushEvent(
    notification: NotificationRecord,
    isFirstPublish: boolean,
  ): NotificationPushEventDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      version: notification.version,
      lastPushedAt: notification.lastPushedAt!.toISOString(),
      deliveryKind: isFirstPublish ? 'published' : 'adjusted',
    };
  }

  private mapNotificationAuthor(
    author: NotificationRecord['createdBy'],
  ): NotificationAuthorDto | null {
    if (!author) {
      return null;
    }

    const displayName = [author.last_name, author.first_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      userId: author.id,
      accountHandle: author.accountHandle,
      email: author.email,
      displayName: displayName || author.accountHandle || author.email,
    };
  }
}
