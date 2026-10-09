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
import { assertAudioAttachable, withAudioRefs } from './audio-asset.service';

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

  private async assertModuleInCourse(
    moduleId: string,
    courseId: string,
  ): Promise<void> {
    const courseModule = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!courseModule || courseModule.courseId !== courseId) {
      throw new BadRequestException('Chuyên đề không thuộc khoá của bộ.');
    }
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
    return withAudioRefs(
      this.prisma,
      rows.map(({ _count, ...m }) => ({
        ...m,
        questionCount: _count.questions,
      })),
    );
  }

  async create(
    dto: CreateSharedMaterialDto,
    actor: MaterialActor,
  ): Promise<SharedMaterialResponseDto> {
    this.assertEnabled();
    await this.courseAccess.assertCourseExists(dto.courseId);
    await this.assertWriteAccess(actor, dto.courseId);
    assertSetHeader(dto.content, dto.audioId ?? null);
    await this.assertModuleInCourse(dto.moduleId, dto.courseId);
    await assertAudioAttachable(
      this.prisma,
      this.lmsProfile.config,
      dto.audioId,
      dto.courseId,
    );
    const created = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sharedMaterial.create({
        data: {
          courseId: dto.courseId,
          moduleId: dto.moduleId,
          title: dto.title.trim(),
          content: dto.content,
          audioId: dto.audioId ?? null,
        },
      });
      await this.actionHistory.recordCreate(tx, {
        entityType: 'shared_material',
        entityId: created.id,
        actor,
        afterValue: created,
      });
      return created;
    });
    const [withAudio] = await withAudioRefs(this.prisma, [
      { ...created, questionCount: 0 },
    ]);
    return withAudio;
  }

  async update(
    id: string,
    dto: UpdateSharedMaterialDto,
    actor: MaterialActor,
  ): Promise<SharedMaterialResponseDto> {
    this.assertEnabled();
    const existing = await this.findOrThrow(id);
    await this.assertWriteAccess(actor, existing.courseId);
    assertSetHeader(
      dto.content ?? existing.content,
      dto.audioId !== undefined ? dto.audioId : existing.audioId,
    );
    const movedTo =
      dto.moduleId !== undefined && dto.moduleId !== existing.moduleId
        ? dto.moduleId
        : null;
    if (movedTo) {
      await this.assertModuleInCourse(movedTo, existing.courseId);
    }
    if (dto.audioId !== undefined && dto.audioId !== existing.audioId) {
      await assertAudioAttachable(
        this.prisma,
        this.lmsProfile.config,
        dto.audioId,
        existing.courseId,
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.sharedMaterial.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.audioId !== undefined && { audioId: dto.audioId }),
          ...(movedTo && { moduleId: movedTo }),
        },
      });
      // Bộ thuộc đúng một chuyên đề: chuyển bộ thì cả bộ đi theo.
      if (movedTo) {
        await tx.question.updateMany({
          where: { sharedMaterialId: id },
          data: { moduleId: movedTo },
        });
      }
      await this.actionHistory.recordUpdate(tx, {
        entityType: 'shared_material',
        entityId: id,
        actor,
        beforeValue: existing,
        afterValue: row,
      });
      return row;
    });
    const [withAudio] = await withAudioRefs(this.prisma, [
      { ...updated, questionCount: await this.activeQuestionCount(id) },
    ]);
    return withAudio;
  }

  /**
   * Sắp lại thứ tự câu trong bộ: `questionIds` phải đúng là mọi câu (chưa xoá)
   * của bộ, mỗi câu một lần; vị trí = thứ tự trong danh sách.
   */
  async reorderQuestions(
    id: string,
    questionIds: string[],
    actor: MaterialActor,
  ): Promise<void> {
    this.assertEnabled();
    const existing = await this.findOrThrow(id);
    await this.assertWriteAccess(actor, existing.courseId);
    const members = await this.prisma.question.findMany({
      where: { sharedMaterialId: id, deletedAt: null },
      select: { id: true },
    });
    const memberIds = new Set(members.map((q) => q.id));
    const sameSet =
      questionIds.length === memberIds.size &&
      new Set(questionIds).size === questionIds.length &&
      questionIds.every((qid) => memberIds.has(qid));
    if (!sameSet) {
      throw new BadRequestException(
        'Danh sách câu không khớp các câu trong bộ — tải lại rồi thử lại.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [setPosition, qid] of questionIds.entries()) {
        await tx.question.update({
          where: { id: qid },
          data: { setPosition },
        });
      }
    });
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
        data: { sharedMaterialId: null, setPosition: null },
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

/** Phần đầu bộ phải có ít nhất một trong: văn bản, ảnh, audio. */
function assertSetHeader(content: string, audioId: string | null): void {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
  if (!text && !/<img\b/i.test(content) && !audioId) {
    throw new BadRequestException(
      'Phần đầu bộ cần có văn bản, ảnh hoặc audio.',
    );
  }
}

/**
 * Gắn câu vào Bộ câu hỏi: hồ sơ phải bật, bộ cùng khoá và cùng chuyên đề với
 * câu. `undefined` = không đổi, `null` = bỏ gắn (luôn hợp lệ).
 */
export async function assertMaterialAttachable(
  prisma: PrismaService,
  profile: LmsProfileConfig,
  sharedMaterialId: string | null | undefined,
  courseId: string,
  moduleId: string,
): Promise<void> {
  if (sharedMaterialId == null) return;
  if (!profile.sharedMaterials) {
    throw new BadRequestException(
      'Hồ sơ môn này không dùng Tư liệu dùng chung.',
    );
  }
  const material = await prisma.sharedMaterial.findUnique({
    where: { id: sharedMaterialId },
    select: { courseId: true, moduleId: true },
  });
  if (!material || material.courseId !== courseId) {
    throw new BadRequestException(
      'Tư liệu dùng chung không thuộc khoá của câu hỏi.',
    );
  }
  if (material.moduleId !== moduleId) {
    throw new BadRequestException('Câu phải cùng chuyên đề với bộ.');
  }
}

/** Vị trí cuối bộ cho câu mới vào bộ. */
export async function nextSetPosition(
  prisma: Pick<PrismaService, 'question'>,
  sharedMaterialId: string,
): Promise<number> {
  const { _max } = await prisma.question.aggregate({
    where: { sharedMaterialId },
    _max: { setPosition: true },
  });
  return (_max.setPosition ?? -1) + 1;
}
