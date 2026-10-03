import { ClassStatus } from 'generated/enums';
import { VIETNAM_TIME_ZONE } from 'src/fixed-salary-settings/current-month.util';
import type { PrismaService } from 'src/prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Hôm nay theo giờ Việt Nam, dạng ngày UTC 00:00 để so trực tiếp với cột `@db.Date`.
 * "Đầu ngày" của khung chặn khảo sát tính theo giờ Việt Nam, không theo UTC.
 */
export function getVietnamToday(now = new Date()): Date {
  const isoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * `endDate` muộn nhất đã vào khung **chặn khảo sát sắp hạn** (CONTEXT.md) tại `today`:
 * khung chặn bắt đầu từ đầu ngày liền trước `endDate` và kéo dài cả sau hạn.
 */
function getLatestBlockedEndDate(today: Date): Date {
  return new Date(today.getTime() + DAY_MS);
}

/** Bài không có `endDate` không bao giờ chặn. */
export function isSurveyDeadlineBlockActive(
  endDate: Date | null,
  today: Date,
): boolean {
  return (
    endDate != null &&
    endDate.getTime() <= getLatestBlockedEndDate(today).getTime()
  );
}

/**
 * Bài khảo sát đã mở và đã vào khung chặn tại `now`. "Đã mở" theo ngày UTC như
 * cảnh báo gia sư (`getTeacherWarnings`) để popup luôn liệt kê đúng những bài
 * đang chặn. `endDate`/`name` null bị loại.
 */
function buildBlockingSurveyWhere(now: Date) {
  const utcToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return {
    name: { not: null },
    startDate: { lte: utcToday },
    endDate: { lte: getLatestBlockedEndDate(getVietnamToday(now)) },
  };
}

export type SurveyBlockingSessionCreation = {
  surveyId: string;
  name: string;
  endDate: Date;
};

/**
 * Bài khảo sát đang chặn gia sư tạo buổi học cho lớp: lớp `running`, bài đã mở,
 * đã vào khung chặn, lớp không bị loại trừ và chưa nộp báo cáo. Rỗng = được tạo.
 */
export async function findSurveysBlockingSessionCreation(
  prisma: Pick<PrismaService, 'class' | 'survey'>,
  classId: string,
  now = new Date(),
): Promise<SurveyBlockingSessionCreation[]> {
  const classRow = await prisma.class.findUnique({
    where: { id: classId },
    select: { status: true },
  });
  if (classRow?.status !== ClassStatus.running) {
    return [];
  }

  const surveys = await prisma.survey.findMany({
    where: {
      ...buildBlockingSurveyWhere(now),
      excludedClasses: { none: { classId } },
      classSurveys: { none: { classId } },
    },
    orderBy: { endDate: 'asc' },
    select: { id: true, name: true, endDate: true },
  });

  // `where` đã loại `name`/`endDate` null.
  return surveys.map((survey) => ({
    surveyId: survey.id,
    name: survey.name ?? '',
    endDate: survey.endDate as Date,
  }));
}

export type TeacherSurveyDeadlineBlock = {
  surveyId: string;
  surveyName: string;
  endDate: Date;
  classNames: string[];
};

/**
 * Bài khảo sát đang trong khung chặn mà gia sư còn lớp `running` chưa nộp, kèm
 * tên các lớp đó. Cùng quy tắc với `findSurveysBlockingSessionCreation`; dùng cho
 * cảnh báo kế toán chi khi trả trợ cấp.
 */
export async function findTeacherSurveyDeadlineBlocks(
  prisma: Pick<PrismaService, 'class' | 'survey'>,
  staffId: string,
  now = new Date(),
): Promise<TeacherSurveyDeadlineBlock[]> {
  const runningClasses = await prisma.class.findMany({
    where: {
      status: ClassStatus.running,
      teachers: { some: { teacherId: staffId } },
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  if (!runningClasses.length) {
    return [];
  }

  const classIds = runningClasses.map((classItem) => classItem.id);
  const surveys = await prisma.survey.findMany({
    where: buildBlockingSurveyWhere(now),
    orderBy: { endDate: 'asc' },
    select: {
      id: true,
      name: true,
      endDate: true,
      excludedClasses: {
        where: { classId: { in: classIds } },
        select: { classId: true },
      },
      classSurveys: {
        where: { classId: { in: classIds } },
        select: { classId: true },
      },
    },
  });

  return surveys.flatMap((survey) => {
    const settledClassIds = new Set(
      [...survey.excludedClasses, ...survey.classSurveys].map(
        (row) => row.classId,
      ),
    );
    const classNames = runningClasses
      .filter((classItem) => !settledClassIds.has(classItem.id))
      .map((classItem) => classItem.name);
    return classNames.length
      ? [
          {
            surveyId: survey.id,
            surveyName: survey.name ?? '',
            endDate: survey.endDate as Date,
            classNames,
          },
        ]
      : [];
  });
}
