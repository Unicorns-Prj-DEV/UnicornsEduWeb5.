import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  QuestionLinkCreateDto,
  QuestionLinkUpdateDto,
  QuestionLinkResponseDto,
  QuestionLinkSummaryDto,
} from 'src/dtos/course-content.dto';
import { LessonKind, QuestionSlot } from 'generated/enums';
import { Prisma } from '../../generated/client';
import { examFormError } from 'src/attempt/exam-form';
import { loadLmsProfile } from 'src/lms-profile/lms-profile';
import {
  ActionHistoryActor,
  CourseContentSupportService,
} from './course-content-support.service';

const LINK_INCLUDE = {
  question: {
    select: {
      id: true,
      courseId: true,
      moduleId: true,
      difficultyLevelId: true,
      type: true,
      content: true,
      options: true,
      correctIndex: true,
      tfAnswerKey: true,
      explanation: true,
      answerGuide: true,
    },
  },
} satisfies Prisma.QuestionLinkInclude;

type LinkWithQuestion = Prisma.QuestionLinkGetPayload<{
  include: typeof LINK_INCLUDE;
}>;

function toLinkResponse(link: LinkWithQuestion): QuestionLinkResponseDto {
  return {
    id: link.id,
    lessonId: link.lessonId,
    questionId: link.questionId,
    order: link.order,
    points: link.points,
    slot: link.slot,
    question: link.question,
  };
}

@Injectable()
export class PracticeQuestionLinkService extends CourseContentSupportService {
  protected readonly logger = new Logger(PracticeQuestionLinkService.name);

  // ─── Question Link CRUD (Practice Topic / Đề) ───

  private async validatePracticeLesson(lessonId: string) {
    const topic = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!topic) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }
    if (topic.kind !== LessonKind.practice) {
      throw new BadRequestException(
        'Chỉ tiết thực hành mới có danh sách câu hỏi',
      );
    }
    let courseId = topic.courseId;
    if (!courseId) {
      if (!topic.classId) {
        throw new BadRequestException(
          'Tiết thực hành phải thuộc một khoá học hoặc một lớp',
        );
      }
      const cls = await this.prisma.class.findUnique({
        where: { id: topic.classId },
        select: { courseId: true },
      });
      if (!cls) {
        throw new NotFoundException(`Class ${topic.classId} not found`);
      }
      courseId = cls.courseId;
    }
    return { topic, courseId };
  }

  /**
   * Course-level đề / cây Kiến thức: assertCanManageCourse — dạy lớp ≠ soạn giáo án.
   * Class-owned practice: staff who can access that class (incl. gia sư).
   */

  /**
   * Course-level đề / cây Kiến thức: assertCanManageCourse — dạy lớp ≠ soạn giáo án.
   * Class-owned practice: staff who can access that class (incl. gia sư).
   */
  private async assertCanLinkPracticeQuestions(
    topic: { classId: string | null; courseId: string | null },
    courseId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    if (topic.classId) {
      await this.validateStaffClassAccess(topic.classId, actor);
      return;
    }
    await this.assertCanManageCourseContent(actor, courseId);
  }

  /** Chỉ hồ sơ có nhóm tự chọn (IT) mới đặt được vị trí khác Bắt buộc. */
  private resolveSlot(slot: QuestionSlot | undefined): QuestionSlot {
    if (!slot || slot === QuestionSlot.required) return QuestionSlot.required;
    if (!loadLmsProfile(process.env).electiveGroups) {
      throw new BadRequestException(
        'Hồ sơ môn của hệ thống không có nhóm tự chọn.',
      );
    }
    return slot;
  }

  async getQuestionsByLessonId(
    lessonId: string,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto[]> {
    const { topic, courseId } = await this.validatePracticeLesson(lessonId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const links = await this.prisma.questionLink.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' },
      include: LINK_INCLUDE,
    });

    return links.map((link) => toLinkResponse(link));
  }

  async addQuestionToLesson(
    lessonId: string,
    dto: QuestionLinkCreateDto,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto> {
    const { topic, courseId } = await this.validatePracticeLesson(lessonId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    // Validate question exists and belongs to same course
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
    });
    if (!question || question.deletedAt) {
      throw new NotFoundException(`Question ${dto.questionId} not found`);
    }
    if (question.courseId !== courseId) {
      throw new BadRequestException(
        'Câu hỏi phải thuộc cùng khoá học với chuyên đề',
      );
    }

    // Check duplicate
    const existing = await this.prisma.questionLink.findUnique({
      where: { lessonId_questionId: { lessonId, questionId: dto.questionId } },
    });
    if (existing) {
      throw new BadRequestException('Câu hỏi đã được thêm vào chuyên đề này');
    }

    // Determine order: append at end
    const maxOrder = await this.prisma.questionLink.aggregate({
      where: { lessonId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const link = await this.prisma.questionLink.create({
      data: {
        lessonId,
        questionId: dto.questionId,
        order: dto.order ?? nextOrder,
        points: dto.points ?? null,
        slot: this.resolveSlot(dto.slot),
      },
      include: LINK_INCLUDE,
    });

    this.logger.log(
      `Question linked to topic: question ${dto.questionId} → topic ${lessonId} by ${actor.userEmail}`,
    );

    return toLinkResponse(link);
  }

  async updateQuestionLink(
    lessonId: string,
    linkId: string,
    dto: QuestionLinkUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<QuestionLinkResponseDto> {
    const { topic, courseId } = await this.validatePracticeLesson(lessonId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const link = await this.prisma.questionLink.findUnique({
      where: { id: linkId },
    });
    if (!link || link.lessonId !== lessonId) {
      throw new NotFoundException('Question link not found');
    }

    const updated = await this.prisma.questionLink.update({
      where: { id: linkId },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.points !== undefined && { points: dto.points }),
        ...(dto.slot !== undefined && { slot: this.resolveSlot(dto.slot) }),
      },
      include: LINK_INCLUDE,
    });

    this.logger.log(`Question link updated: ${linkId} by ${actor.userEmail}`);

    return toLinkResponse(updated);
  }

  async removeQuestionFromLesson(
    lessonId: string,
    linkId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const { topic, courseId } = await this.validatePracticeLesson(lessonId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    const link = await this.prisma.questionLink.findUnique({
      where: { id: linkId },
    });
    if (!link || link.lessonId !== lessonId) {
      throw new NotFoundException('Question link not found');
    }

    await this.prisma.questionLink.delete({ where: { id: linkId } });
    this.logger.log(
      `Question unlinked from topic: link ${linkId} from topic ${lessonId} by ${actor.userEmail}`,
    );
  }

  async reorderQuestionLinks(
    lessonId: string,
    linkIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    const { topic, courseId } = await this.validatePracticeLesson(lessonId);
    await this.assertCanLinkPracticeQuestions(topic, courseId, actor);

    // Verify all links belong to this topic
    const owned = await this.prisma.questionLink.findMany({
      where: { id: { in: linkIds }, lessonId },
      select: { id: true },
    });
    if (owned.length !== linkIds.length) {
      throw new BadRequestException(
        'Một số ID không thuộc tiết học này hoặc không tồn tại',
      );
    }

    await this.prisma.$transaction(
      linkIds.map((id, index) =>
        this.prisma.questionLink.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    this.logger.log(
      `Question links reordered for topic ${lessonId} by ${actor.userEmail}`,
    );
  }

  async getQuestionLinkSummary(
    lessonId: string,
  ): Promise<QuestionLinkSummaryDto> {
    await this.validatePracticeLesson(lessonId);

    const [result, links] = await Promise.all([
      this.prisma.questionLink.aggregate({
        where: { lessonId },
        _count: { id: true },
        _sum: { points: true },
      }),
      this.prisma.questionLink.findMany({
        where: { lessonId },
        select: { slot: true, question: { select: { type: true } } },
      }),
    ]);

    return {
      totalQuestions: result._count.id,
      totalPoints: result._sum.points ?? 0,
      formWarning: examFormError(links),
    };
  }

  async isLessonAssignedToClass(lessonId: string): Promise<boolean> {
    const count = await this.prisma.classContentItem.count({
      where: { lessonId },
    });
    return count > 0;
  }
}
