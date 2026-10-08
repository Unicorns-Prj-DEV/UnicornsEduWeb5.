import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from 'generated/enums';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionHistoryService } from '../action-history/action-history.service';
import { CourseAccessService } from '../class/course-access.service';
import { LmsProfileService } from '../lms-profile/lms-profile.service';
import { regradeQuestionAnswerKey } from '../attempt/regrade';
import { assertQuestionShape } from './question-rules';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  QuestionFilterDto,
  BulkCreateQuestionDto,
} from '../dtos/question.dto';

type QuestionActor = {
  userId?: string;
  userEmail?: string;
  roleType?: UserRole;
};

@Injectable()
export class QuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistory: ActionHistoryService,
    private readonly courseAccess: CourseAccessService,
    private readonly lmsProfile: LmsProfileService = new LmsProfileService(),
  ) {}

  private async assertWriteAccess(
    actor: QuestionActor,
    courseId: string,
  ): Promise<void> {
    const userId = actor.userId;
    if (!userId) {
      throw new BadRequestException('Missing actor for question write');
    }
    const courseActor = await this.courseAccess.resolveActor(
      userId,
      actor.roleType ?? UserRole.staff,
    );
    await this.courseAccess.assertCanWriteCourseQuestions(
      courseActor,
      courseId,
    );
  }

  async list(filter: QuestionFilterDto, skip = 0, take = 20) {
    const where: Prisma.QuestionWhereInput = {};
    if (filter.courseId) where.courseId = filter.courseId;
    if (filter.moduleId) where.moduleId = filter.moduleId;
    if (filter.difficultyLevelId)
      where.difficultyLevelId = filter.difficultyLevelId;
    if (filter.type) where.type = filter.type;
    if (filter.search) {
      where.content = { contains: filter.search, mode: 'insensitive' };
    }
    where.deletedAt = null;
    return this.prisma.question.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q || q.deletedAt) throw new NotFoundException('Question not found');
    return q;
  }

  async create(dto: CreateQuestionDto, actor: QuestionActor) {
    await this.assertWriteAccess(actor, dto.courseId);
    assertQuestionShape(dto, this.lmsProfile.config);

    // Cross-course validation
    await this.assertModuleBelongsToCourse(dto.moduleId, dto.courseId);
    await this.assertDifficultyBelongsToCourse(
      dto.difficultyLevelId,
      dto.courseId,
    );

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.question.create({ data: { ...dto } });
      await this.actionHistory.recordCreate(tx, {
        entityType: 'question',
        entityId: created.id,
        actor,
        afterValue: created,
      });
      return created;
    });
  }

  async update(id: string, dto: UpdateQuestionDto, actor: QuestionActor) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt)
      throw new NotFoundException('Question not found');
    await this.assertWriteAccess(actor, existing.courseId);

    assertQuestionShape(
      {
        type: existing.type,
        options: dto.options ?? existing.options,
        correctIndex:
          dto.correctIndex !== undefined
            ? dto.correctIndex
            : existing.correctIndex,
        tfAnswerKey: dto.tfAnswerKey ?? existing.tfAnswerKey,
      },
      this.lmsProfile.config,
    );

    const answerKeyChange: {
      correctIndex?: number | null;
      tfAnswerKey?: boolean[];
    } = {};
    if (
      dto.correctIndex !== undefined &&
      dto.correctIndex !== existing.correctIndex
    ) {
      answerKeyChange.correctIndex = dto.correctIndex;
    }
    if (
      dto.tfAnswerKey !== undefined &&
      dto.tfAnswerKey.join() !== existing.tfAnswerKey.join()
    ) {
      answerKeyChange.tfAnswerKey = dto.tfAnswerKey;
    }

    const before = existing;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.question.update({
        where: { id },
        data: { ...dto },
      });
      // Sửa đáp án → chấm lại mọi Bài làm chứa câu (ADR it-absolute-scoring).
      await regradeQuestionAnswerKey(tx, id, answerKeyChange);
      await this.actionHistory.recordUpdate(tx, {
        entityType: 'question',
        entityId: id,
        actor,
        beforeValue: before,
        afterValue: updated,
      });
      return updated;
    });
  }

  async delete(id: string, actor: { userId?: string; userEmail?: string }) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q || q.deletedAt) throw new NotFoundException('Question not found');

    const usage = await this.prisma.questionLink.findMany({
      where: { questionId: id },
    });
    if (usage.length) {
      const lessonIds = usage.map((u) => u.lessonId);
      throw new ConflictException({
        message: 'Question is used by practice lessons',
        usedBy: lessonIds,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.question.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.actionHistory.recordDelete(tx, {
        entityType: 'question',
        entityId: id,
        actor,
        beforeValue: q,
      });
      return updated;
    });
  }

  async bulkCreate(dto: BulkCreateQuestionDto, actor: QuestionActor) {
    await this.assertWriteAccess(actor, dto.courseId);
    // Validate cross-course for shared module + difficulty
    await this.assertModuleBelongsToCourse(dto.moduleId, dto.courseId);

    // Validate each item
    for (const [i, item] of dto.questions.entries()) {
      assertQuestionShape(item, this.lmsProfile.config, `Câu ${i + 1}: `);
      if (!item.content || !item.content.trim()) {
        throw new BadRequestException(`Question ${i + 1}: content is required`);
      }
      await this.assertDifficultyBelongsToCourse(
        item.difficultyLevelId,
        dto.courseId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const created: Array<Record<string, unknown>> = [];
      for (const item of dto.questions) {
        const q = await tx.question.create({
          data: {
            courseId: dto.courseId,
            moduleId: dto.moduleId,
            difficultyLevelId: item.difficultyLevelId,
            type: item.type,
            content: item.content,
            options: item.options ?? undefined,
            correctIndex: item.correctIndex ?? undefined,
            tfAnswerKey: item.tfAnswerKey ?? [],
            explanation: item.explanation ?? undefined,
            answerGuide: item.answerGuide ?? undefined,
          },
        });
        await this.actionHistory.recordCreate(tx, {
          entityType: 'question',
          entityId: q.id,
          actor,
          afterValue: q,
        });
        created.push(q);
      }
      return { count: created.length, questions: created };
    });
  }

  private async assertModuleBelongsToCourse(
    moduleId: string,
    courseId: string,
  ) {
    const courseModule = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!courseModule || courseModule.courseId !== courseId) {
      throw new BadRequestException(
        'Module does not belong to the specified course',
      );
    }
  }

  private async assertDifficultyBelongsToCourse(
    difficultyLevelId: string,
    courseId: string,
  ) {
    const level = await this.prisma.courseDifficultyLevel.findUnique({
      where: { id: difficultyLevelId },
      select: { courseId: true },
    });
    if (!level || level.courseId !== courseId) {
      throw new BadRequestException(
        'Difficulty level does not belong to the specified course',
      );
    }
  }
}
