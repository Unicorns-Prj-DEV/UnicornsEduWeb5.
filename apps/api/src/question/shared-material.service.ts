import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from 'generated/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { LmsProfileConfig } from '../lms-profile/lms-profile';
import { ActionHistoryService } from '../action-history/action-history.service';
import { CourseAccessService } from '../class/course-access.service';
import { LmsProfileService } from '../lms-profile/lms-profile.service';
import {
  CreateSharedMaterialDto,
  SharedMaterialResponseDto,
  UpdateSharedMaterialDto,
} from '../dtos/shared-material.dto';

type MaterialActor = {
  userId?: string;
  userEmail?: string;
  roleType?: UserRole;
};

/** Tư liệu dùng chung của ngân hàng câu hỏi (ADR 2026-10-09-shared-material). */
@Injectable()
export class SharedMaterialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistory: ActionHistoryService,
    private readonly courseAccess: CourseAccessService,
    private readonly lmsProfile: LmsProfileService = new LmsProfileService(),
  ) {}

  private assertEnabled(): void {
    if (!this.lmsProfile.config.sharedMaterials) {
      throw new BadRequestException(
        'Hồ sơ môn này không dùng Tư liệu dùng chung.',
      );
    }
  }

  private async assertWriteAccess(
    actor: MaterialActor,
    courseId: string,
  ): Promise<void> {
    if (!actor.userId) {
      throw new BadRequestException('Missing actor for shared material write');
    }
    const courseActor = await this.courseAccess.resolveActor(
      actor.userId,
      actor.roleType ?? UserRole.staff,
    );
    await this.courseAccess.assertCanWriteCourseQuestions(
      courseActor,
      courseId,
    );
  }

  private async findOrThrow(id: string) {
    const material = await this.prisma.sharedMaterial.findUnique({
      where: { id },
    });
    if (!material) {
      throw new NotFoundException('Không tìm thấy tư liệu.');
    }
    return material;
  }

  private activeQuestionCount(sharedMaterialId: string): Promise<number> {
    return this.prisma.question.count({
      where: { sharedMaterialId, deletedAt: null },
    });
  }

  async list(courseId: string): Promise<SharedMaterialResponseDto[]> {
    this.assertEnabled();
    const rows = await this.prisma.sharedMaterial.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: { where: { deletedAt: null } } } },
      },
    });
    return rows.map(({ _count, ...m }) => ({
      ...m,
      questionCount: _count.questions,
    }));
  }

  async create(
    dto: CreateSharedMaterialDto,
    actor: MaterialActor,
  ): Promise<SharedMaterialResponseDto> {
    this.assertEnabled();
    await this.courseAccess.assertCourseExists(dto.courseId);
    await this.assertWriteAccess(actor, dto.courseId);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.sharedMaterial.create({
        data: {
          courseId: dto.courseId,
          title: dto.title.trim(),
          content: dto.content,
        },
      });
      await this.actionHistory.recordCreate(tx, {
        entityType: 'shared_material',
        entityId: created.id,
        actor,
        afterValue: created,
      });
      return { ...created, questionCount: 0 };
    });
  }

  async update(
    id: string,
    dto: UpdateSharedMaterialDto,
    actor: MaterialActor,
  ): Promise<SharedMaterialResponseDto> {
    this.assertEnabled();
    const existing = await this.findOrThrow(id);
    await this.assertWriteAccess(actor, existing.courseId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.sharedMaterial.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.content !== undefined && { content: dto.content }),
        },
      });
      await this.actionHistory.recordUpdate(tx, {
        entityType: 'shared_material',
        entityId: id,
        actor,
        beforeValue: existing,
        afterValue: row,
      });
      return row;
    });
    return { ...updated, questionCount: await this.activeQuestionCount(id) };
  }

  /** Còn câu (chưa xoá) gắn vào → 409. Câu đã xoá mềm được tháo khỏi tư liệu. */
  async delete(id: string, actor: MaterialActor) {
    this.assertEnabled();
    const existing = await this.findOrThrow(id);
    await this.assertWriteAccess(actor, existing.courseId);
    const inUse = await this.activeQuestionCount(id);
    if (inUse > 0) {
      throw new ConflictException(
        `Tư liệu đang được ${inUse} câu hỏi dùng — bỏ gắn các câu trước khi xoá.`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.question.updateMany({
        where: { sharedMaterialId: id },
        data: { sharedMaterialId: null },
      });
      const deleted = await tx.sharedMaterial.delete({ where: { id } });
      await this.actionHistory.recordDelete(tx, {
        entityType: 'shared_material',
        entityId: id,
        actor,
        beforeValue: existing,
      });
      return deleted;
    });
  }
}

/**
 * Gắn câu vào tư liệu: hồ sơ phải bật và tư liệu phải cùng khoá với câu.
 * `undefined` = không đổi, `null` = bỏ gắn (luôn hợp lệ).
 */
export async function assertMaterialAttachable(
  prisma: PrismaService,
  profile: LmsProfileConfig,
  sharedMaterialId: string | null | undefined,
  courseId: string,
): Promise<void> {
  if (sharedMaterialId == null) return;
  if (!profile.sharedMaterials) {
    throw new BadRequestException(
      'Hồ sơ môn này không dùng Tư liệu dùng chung.',
    );
  }
  const material = await prisma.sharedMaterial.findUnique({
    where: { id: sharedMaterialId },
    select: { courseId: true },
  });
  if (!material || material.courseId !== courseId) {
    throw new BadRequestException(
      'Tư liệu dùng chung không thuộc khoá của câu hỏi.',
    );
  }
}
