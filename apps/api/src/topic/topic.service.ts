import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActionHistoryService } from 'src/action-history/action-history.service';
import { TopicCreateDto, TopicUpdateDto, TopicResponseDto } from 'src/dtos/topic.dto';
import { UserRole } from 'generated/enums';

export interface ActionHistoryActor {
  userId: string;
  userEmail: string;
  roleType: UserRole;
}

@Injectable()
export class TopicService {
  private readonly logger = new Logger(TopicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistory: ActionHistoryService,
  ) {}

  async createTopic(
    classId: string,
    dto: TopicCreateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    await this.validateClassExists(classId);
    await this.validateStaffClassAccess(classId, actor);

    const topic = await this.prisma.topic.create({
      data: {
        classId,
        title: dto.title,
        videoUrl: dto.videoUrl ?? null,
        content: dto.content ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      },
    });

    this.logger.log(`Topic created: ${topic.id} for class ${classId} by ${actor.userEmail}`);

    return topic;
  }

  async updateTopic(
    topicId: string,
    dto: TopicUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<TopicResponseDto> {
    const existing = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!existing) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    await this.validateStaffClassAccess(existing.classId, actor);

    const topic = await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.content !== undefined && { content: dto.content }),
        updatedBy: actor.userId,
      },
    });

    this.logger.log(`Topic updated: ${topicId} by ${actor.userEmail}`);

    return topic;
  }

  async deleteTopic(topicId: string, actor: ActionHistoryActor): Promise<void> {
    const existing = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!existing) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    await this.validateStaffClassAccess(existing.classId, actor);

    await this.prisma.topic.delete({ where: { id: topicId } });

    this.logger.log(`Topic deleted: ${topicId} by ${actor.userEmail}`);
  }

  async getTopicsByClassId(
    classId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: TopicResponseDto[]; total: number; page: number; limit: number }> {
    await this.validateClassExists(classId);

    const [data, total] = await Promise.all([
      this.prisma.topic.findMany({
        where: { classId },
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where: { classId } }),
    ]);

    return { data, total, page, limit };
  }

  async getTopicById(topicId: string): Promise<TopicResponseDto> {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }
    return topic;
  }

  async getTopicsForStudent(
    classId: string,
    studentId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: TopicResponseDto[]; total: number; page: number; limit: number }> {
    await this.validateClassExists(classId);
    await this.validateStudentClassAccess(classId, studentId);

    const [data, total] = await Promise.all([
      this.prisma.topic.findMany({
        where: { classId },
        orderBy: { order: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where: { classId } }),
    ]);

    return { data, total, page, limit };
  }

  async getTopicForStudent(topicId: string, studentId: string): Promise<TopicResponseDto> {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new NotFoundException(`Topic ${topicId} not found`);
    }

    await this.validateStudentClassAccess(topic.classId, studentId);

    return topic;
  }

  private async validateClassExists(classId: string): Promise<void> {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundException(`Class ${classId} not found`);
    }
  }

  private async validateStaffClassAccess(classId: string, actor: ActionHistoryActor): Promise<void> {
    if (actor.roleType === UserRole.admin) return;

    const staffInfo = await this.prisma.staffInfo.findFirst({
      where: { userId: actor.userId },
    });
    if (!staffInfo) {
      throw new ForbiddenException('Staff profile not found');
    }

    const isTeacher = await this.prisma.classTeacher.findFirst({
      where: { classId, teacherId: staffInfo.id, status: 'active' },
    });

    const hasAssistantRole = await this.prisma.staffInfo.findFirst({
      where: { userId: actor.userId },
      select: { id: true },
    });

    if (!isTeacher && !hasAssistantRole) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }

  private async validateStudentClassAccess(classId: string, studentId: string): Promise<void> {
    const enrollment = await this.prisma.studentClass.findFirst({
      where: { classId, studentId, status: 'active' },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
  }

  async reorderTopics(
    classId: string,
    topicIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    await this.validateClassExists(classId);
    await this.validateStaffClassAccess(classId, actor);

    const updates = topicIds.map((id, index) =>
      this.prisma.topic.update({
        where: { id, classId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }
}
