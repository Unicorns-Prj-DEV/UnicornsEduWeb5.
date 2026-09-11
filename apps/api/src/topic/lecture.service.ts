import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  LectureCreateDto,
  LectureUpdateDto,
  LectureResponseDto,
} from 'src/dtos/topic.dto';
import { TopicKind } from 'generated/enums';
import {
  ActionHistoryActor,
  TopicSupportService,
} from './topic-support.service';

@Injectable()
export class LectureService extends TopicSupportService {
  protected readonly logger = new Logger(LectureService.name);

  // ─── Lecture CRUD ───

  async createLecture(
    topicId: string,
    dto: LectureCreateDto,
    actor: ActionHistoryActor,
  ): Promise<LectureResponseDto> {
    const topic = await this.validateTopicExists(topicId);
    await this.assertCanManageOwnedAcademicContent(actor, topic);

    if (topic.kind !== TopicKind.theory) {
      throw new BadRequestException('Chỉ chuyên đề lý thuyết mới có bài học');
    }

    const lecture = await this.prisma.lecture.create({
      data: {
        topicId,
        title: dto.title,
        videoUrl: dto.videoUrl ?? null,
        content: dto.content ?? null,
      },
    });

    this.logger.log(
      `Lecture created: ${lecture.id} for topic ${topicId} by ${actor.userEmail}`,
    );

    return lecture;
  }

  async updateLecture(
    lectureId: string,
    dto: LectureUpdateDto,
    actor: ActionHistoryActor,
  ): Promise<LectureResponseDto> {
    const existing = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, existing.topic);

    const lecture = await this.prisma.lecture.update({
      where: { id: lectureId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
        ...(dto.content !== undefined && { content: dto.content }),
      },
    });

    this.logger.log(`Lecture updated: ${lectureId} by ${actor.userEmail}`);
    return lecture;
  }

  async deleteLecture(
    lectureId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const existing = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!existing) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, existing.topic);

    await this.assertTopicsNotUsedByClasses([existing.topicId], 'Bài học');

    await this.prisma.lecture.delete({ where: { id: lectureId } });
    this.logger.log(`Lecture deleted: ${lectureId} by ${actor.userEmail}`);
  }

  async getLecturesByTopicId(topicId: string): Promise<LectureResponseDto[]> {
    await this.validateTopicExists(topicId);

    return this.prisma.lecture.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
    });
  }

  async getLectureById(lectureId: string): Promise<LectureResponseDto> {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    return lecture;
  }

  async reorderLectures(
    topicId: string,
    lectureIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    const topic = await this.validateTopicExists(topicId);
    await this.assertCanManageOwnedAcademicContent(actor, topic);

    const updates = lectureIds.map((id, index) =>
      this.prisma.lecture.update({
        where: { id, topicId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  // ─── Lecture Quiz ───

  // ─── Lecture Quiz ───

  async linkQuizQuestions(
    lectureId: string,
    questionIds: string[],
    actor: ActionHistoryActor,
  ): Promise<void> {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, lecture.topic);

    // Validate questions belong to the same course
    if (lecture.topic.courseId) {
      const questions = await this.prisma.question.findMany({
        where: {
          id: { in: questionIds },
          courseId: lecture.topic.courseId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (questions.length !== questionIds.length) {
        throw new BadRequestException(
          'Một số câu hỏi không thuộc khoá học này',
        );
      }
    }

    // Get current max order
    const maxOrder = await this.prisma.lectureQuiz.aggregate({
      where: { lectureId },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order ?? -1) + 1;

    await this.prisma.$transaction(async (tx) => {
      for (const questionId of questionIds) {
        // Skip if already linked
        const existing = await tx.lectureQuiz.findUnique({
          where: { lectureId_questionId: { lectureId, questionId } },
        });
        if (!existing) {
          await tx.lectureQuiz.create({
            data: { lectureId, questionId, order: nextOrder++ },
          });
        }
      }

      await this.actionHistory.recordCreate(tx, {
        entityType: 'lecture_quiz',
        entityId: lectureId,
        actor,
        afterValue: { lectureId, questionIds },
      });
    });

    this.logger.log(
      `Quiz questions linked to lecture ${lectureId} by ${actor.userEmail}`,
    );
  }

  async unlinkQuizQuestion(
    lectureId: string,
    questionId: string,
    actor: ActionHistoryActor,
  ): Promise<void> {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, lecture.topic);

    const link = await this.prisma.lectureQuiz.findUnique({
      where: { lectureId_questionId: { lectureId, questionId } },
    });
    if (!link) {
      throw new NotFoundException('Câu hỏi chưa được gắn vào bài học này');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lectureQuiz.delete({
        where: { lectureId_questionId: { lectureId, questionId } },
      });

      await this.actionHistory.recordDelete(tx, {
        entityType: 'lecture_quiz',
        entityId: lectureId,
        actor,
        beforeValue: link,
      });
    });

    this.logger.log(
      `Quiz question ${questionId} unlinked from lecture ${lectureId} by ${actor.userEmail}`,
    );
  }

  async getLectureQuizzes(lectureId: string, actor: ActionHistoryActor) {
    const lecture = await this.prisma.lecture.findUnique({
      where: { id: lectureId },
      include: { topic: { select: { courseId: true, classId: true } } },
    });
    if (!lecture) {
      throw new NotFoundException(`Lecture ${lectureId} not found`);
    }
    await this.assertCanManageOwnedAcademicContent(actor, lecture.topic);

    return this.prisma.lectureQuiz.findMany({
      where: { lectureId },
      orderBy: { order: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });
  }

  async getLectureQuizzesForStudent(lectureId: string) {
    await this.getLectureById(lectureId); // validate exists

    // Students see questions without correctIndex (revealed only after submission)
    const quizzes = await this.prisma.lectureQuiz.findMany({
      where: { lectureId },
      orderBy: { order: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });

    return quizzes.map((q) => ({
      ...q,
      question: { ...q.question, correctIndex: null },
    }));
  }

  async submitQuizAnswers(
    lectureId: string,
    studentId: string,
    answers: {
      questionId: string;
      choiceIndex?: number | null;
      essayAnswer?: string | null;
    }[],
  ) {
    await this.getLectureById(lectureId); // validate exists

    // Verify all questions are linked to this lecture
    const linkedQuestionIds = (
      await this.prisma.lectureQuiz.findMany({
        where: { lectureId },
        select: { questionId: true },
      })
    ).map((q) => q.questionId);

    const linkedQuestionIdSet = new Set(linkedQuestionIds);
    const invalid = answers.filter(
      (a) => !linkedQuestionIdSet.has(a.questionId),
    );
    if (invalid.length) {
      throw new BadRequestException('Một số câu hỏi không thuộc bài học này');
    }

    // Upsert answers
    await this.prisma.$transaction(
      answers.map((a) =>
        this.prisma.lectureQuizAnswer.upsert({
          where: {
            lectureId_questionId_studentId: {
              lectureId,
              questionId: a.questionId,
              studentId,
            },
          },
          create: {
            lectureId,
            questionId: a.questionId,
            studentId,
            choiceIndex: a.choiceIndex ?? null,
            essayAnswer: a.essayAnswer ?? null,
          },
          update: {
            choiceIndex: a.choiceIndex ?? null,
            essayAnswer: a.essayAnswer ?? null,
          },
        }),
      ),
    );

    // Return answers with correctIndex for review
    return this.prisma.lectureQuizAnswer.findMany({
      where: { lectureId, studentId },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });
  }

  async getQuizAnswers(lectureId: string, studentId: string) {
    return this.prisma.lectureQuizAnswer.findMany({
      where: { lectureId, studentId },
      include: {
        question: {
          select: {
            id: true,
            type: true,
            content: true,
            options: true,
            correctIndex: true,
            explanation: true,
            answerGuide: true,
          },
        },
      },
    });
  }
}
