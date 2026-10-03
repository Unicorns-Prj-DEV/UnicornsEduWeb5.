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
 * **Chặn khảo sát sắp hạn** (CONTEXT.md): từ đầu ngày liền trước `endDate` trở đi,
 * kể cả sau hạn. Bài không có `endDate` không bao giờ chặn.
 */
export function isSurveyDeadlineBlockActive(
  endDate: Date | null,
  today: Date,
): boolean {
  return endDate != null && today.getTime() >= endDate.getTime() - DAY_MS;
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

  const today = getVietnamToday(now);
  const surveys = await prisma.survey.findMany({
    where: {
      name: { not: null },
      startDate: { lte: today },
      endDate: { lte: new Date(today.getTime() + DAY_MS) },
      excludedClasses: { none: { classId } },
      classSurveys: { none: { classId } },
    },
    orderBy: { endDate: 'asc' },
    select: { id: true, name: true, endDate: true },
  });

  return surveys
    .filter((survey) => isSurveyDeadlineBlockActive(survey.endDate, today))
    .map((survey) => ({
      surveyId: survey.id,
      name: survey.name ?? '',
      endDate: survey.endDate as Date,
    }));
}
