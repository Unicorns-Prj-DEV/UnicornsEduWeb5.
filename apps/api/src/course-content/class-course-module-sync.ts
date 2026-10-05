import { Prisma } from '../../generated/client';
import { LessonKind } from 'generated/enums';
import { appendClassTimelineContentItems } from 'src/class-timeline/append-timeline-item';

type Tx = Prisma.TransactionClient;

export interface ClassModuleSyncResult {
  createdItemIds: string[];
  restoredItemIds: string[];
}

/**
 * Đưa mọi tiết lý thuyết (chưa lưu trữ) của một chuyên đề vào nội dung lớp:
 * tạo `ClassContentItem` + dòng timeline cho tiết còn thiếu, theo thứ tự tiết.
 * `restoreHidden` = true khi gia sư chủ động thêm chuyên đề → hiện lại các tiết đã ẩn.
 * Idempotent; tiết thực hành không bao giờ được đụng tới.
 */
export async function syncClassModuleTheoryLessons(
  tx: Tx,
  input: { classId: string; moduleId: string; restoreHidden: boolean },
): Promise<ClassModuleSyncResult> {
  const { classId, moduleId, restoreHidden } = input;
  const lessons = await tx.lesson.findMany({
    where: { moduleId, kind: LessonKind.theory, archivedAt: null },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  if (lessons.length === 0) {
    return { createdItemIds: [], restoredItemIds: [] };
  }

  const existing = await tx.classContentItem.findMany({
    where: { classId, lessonId: { in: lessons.map((lesson) => lesson.id) } },
    select: { id: true, lessonId: true, hiddenAt: true },
  });
  const existingLessonIds = new Set(existing.map((item) => item.lessonId));
  const missing = lessons.filter((lesson) => !existingLessonIds.has(lesson.id));

  const createdItemIds: string[] = [];
  if (missing.length > 0) {
    const maxSort = await tx.classContentItem.aggregate({
      where: { classId },
      _max: { sortOrder: true },
    });
    const baseSort = (maxSort._max.sortOrder ?? -1) + 1;
    // created_at lệch 1ms/tiết: timeline sắp theo thời gian giữ đúng thứ tự tiết.
    const baseMs = Date.now();
    for (const [idx, lesson] of missing.entries()) {
      const created = await tx.classContentItem.create({
        data: {
          classId,
          lessonId: lesson.id,
          kind: 'lesson',
          sortOrder: baseSort + idx,
          createdAt: new Date(baseMs + idx),
        },
        select: { id: true },
      });
      createdItemIds.push(created.id);
    }
    await appendClassTimelineContentItems(tx, classId, createdItemIds);
  }

  const restoredItemIds = restoreHidden
    ? existing.filter((item) => item.hiddenAt).map((item) => item.id)
    : [];
  if (restoredItemIds.length > 0) {
    await tx.classContentItem.updateMany({
      where: { id: { in: restoredItemIds } },
      data: { hiddenAt: null, hiddenByStaffId: null },
    });
    await tx.classTimelineItem.updateMany({
      where: { classContentItemId: { in: restoredItemIds } },
      data: { hiddenAt: null, hiddenByStaffId: null },
    });
  }

  return { createdItemIds, restoredItemIds };
}

/** Tiết lý thuyết mới vào chuyên đề → có mặt trên mọi lớp đã thêm chuyên đề đó. */
export async function syncNewTheoryLessonToClasses(
  tx: Tx,
  moduleId: string,
): Promise<void> {
  const classModules = await tx.classModule.findMany({
    where: { moduleId },
    select: { classId: true },
  });
  for (const { classId } of classModules) {
    await syncClassModuleTheoryLessons(tx, {
      classId,
      moduleId,
      restoreHidden: false,
    });
  }
}
