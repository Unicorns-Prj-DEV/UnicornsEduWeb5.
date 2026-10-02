import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LessonKind } from 'generated/enums';
import { ClassModuleResponseDto } from 'src/dtos/course-content.dto';
import { syncClassModuleTheoryLessons } from './class-course-module-sync';
import {
  ActionHistoryActor,
  CourseContentSupportService,
} from './course-content-support.service';

const CLASS_MODULE_TRANSACTION_TIMEOUT_MS = 30_000;

/**
 * Nội dung lớp theo Chuyên đề: lớp thêm/gỡ nguyên chuyên đề của khoá. Thêm chuyên đề
 * đưa mọi tiết lý thuyết vào lớp; tiết thực hành giao từng tiết (không đi theo).
 * ADR: docs/adr/2026-10-02-class-content-by-module.md.
 */
@Injectable()
export class ClassCourseModuleService extends CourseContentSupportService {
  protected readonly logger = new Logger(ClassCourseModuleService.name);

  async listClassModules(
    classId: string,
    actor: ActionHistoryActor,
  ): Promise<ClassModuleResponseDto[]> {
    await this.validateStaffClassAccess(classId, actor);
    const courseId = await this.findClassCourseId(classId);

    const [modules, added] = await Promise.all([
      this.prisma.module.findMany({
        where: { courseId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          sortOrder: true,
          lessons: {
            where: { archivedAt: null },
            select: { kind: true },
          },
        },
      }),
      this.prisma.classModule.findMany({
        where: { classId },
        select: { moduleId: true, createdAt: true },
      }),
    ]);
    const addedAtByModule = new Map(
      added.map((row) => [row.moduleId, row.createdAt]),
    );

    return modules.map((courseModule) => {
      const addedAt = addedAtByModule.get(courseModule.id) ?? null;
      return {
        moduleId: courseModule.id,
        title: courseModule.title,
        sortOrder: courseModule.sortOrder,
        theoryLessonCount: courseModule.lessons.filter(
          (lesson) => lesson.kind === LessonKind.theory,
        ).length,
        practiceLessonCount: courseModule.lessons.filter(
          (lesson) => lesson.kind === LessonKind.practice,
        ).length,
        added: addedAt != null,
        addedAt,
      };
    });
  }

  async addClassModule(
    classId: string,
    moduleId: string,
    actor: ActionHistoryActor,
  ): Promise<ClassModuleResponseDto[]> {
    await this.validateStaffClassAccess(classId, actor);
    const courseId = await this.findClassCourseId(classId);
    const courseModule = await this.validateModuleExists(moduleId);
    if (courseModule.courseId !== courseId) {
      throw new BadRequestException('Chuyên đề không thuộc khoá của lớp này.');
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.classModule.findUnique({
          where: { classId_moduleId: { classId, moduleId } },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException('Lớp đã có chuyên đề này.');
        }
        await tx.classModule.create({ data: { classId, moduleId } });
        return syncClassModuleTheoryLessons(tx, {
          classId,
          moduleId,
          restoreHidden: true,
        });
      },
      { timeout: CLASS_MODULE_TRANSACTION_TIMEOUT_MS },
    );

    this.logger.log(
      `Class module added: ${moduleId} to class ${classId} (+${result.createdItemIds.length} theory, ${result.restoredItemIds.length} restored) by ${actor.userEmail}`,
    );
    return this.listClassModules(classId, actor);
  }

  /**
   * Gỡ chuyên đề: ẩn mềm các tiết lý thuyết của chuyên đề trong lớp (giữ lượt xem).
   * Lần giao tiết thực hành của chuyên đề giữ nguyên.
   */
  async removeClassModule(
    classId: string,
    moduleId: string,
    actor: ActionHistoryActor,
  ): Promise<ClassModuleResponseDto[]> {
    await this.validateStaffClassAccess(classId, actor);
    const hiddenByStaffId = await this.resolveHiddenByStaffId(actor);
    const hiddenAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // deleteMany + count trong transaction: hai lần gỡ đồng thời → lần sau 404, không P2025.
      const { count } = await tx.classModule.deleteMany({
        where: { classId, moduleId },
      });
      if (count === 0) {
        throw new NotFoundException('Lớp chưa thêm chuyên đề này.');
      }
      const theoryItems = await tx.classContentItem.findMany({
        where: {
          classId,
          hiddenAt: null,
          lesson: { moduleId, kind: LessonKind.theory },
        },
        select: { id: true },
      });
      const itemIds = theoryItems.map((item) => item.id);
      if (itemIds.length === 0) return;
      await tx.classContentItem.updateMany({
        where: { id: { in: itemIds } },
        data: { hiddenAt, hiddenByStaffId },
      });
      await tx.classTimelineItem.updateMany({
        where: { classContentItemId: { in: itemIds } },
        data: { hiddenAt, hiddenByStaffId },
      });
    });

    this.logger.log(
      `Class module removed: ${moduleId} from class ${classId} by ${actor.userEmail}`,
    );
    return this.listClassModules(classId, actor);
  }

  private async findClassCourseId(classId: string): Promise<string> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { courseId: true },
    });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);
    return cls.courseId;
  }
}
