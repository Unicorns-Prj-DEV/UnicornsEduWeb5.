import { randomBytes } from 'node:crypto';
import type { Prisma } from 'generated/client';
import { StudentStatus } from 'generated/enums';

/** Luật username UNIOJ (tài liệu partner-students): chặt hơn luật account handle LMS. */
export const UNIOJ_USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
export const UNIOJ_USERNAME_RULE =
  'Tên đăng nhập 3–50 ký tự, chỉ gồm chữ không dấu, số, dấu chấm (.), gạch dưới (_) hoặc gạch ngang (-).';

export const UNIOJ_EXTERNAL_ID_PATTERN = /^UNIST-[0-9a-f]{10}$/;

export type UniojRoleReason =
  | 'student_inactive'
  | 'student_deleted'
  | 'student_reactivated';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** ULID 26 ký tự (48 bit thời gian + 80 bit ngẫu nhiên), dùng làm `event_id`. */
export function generateUlid(now = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i += 1) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = randomBytes(16);
  let rand = '';
  for (let i = 0; i < 16; i += 1) {
    rand += CROCKFORD[bytes[i] % 32];
  }
  return time + rand;
}

type SyncTx = Pick<Prisma.TransactionClient, 'uniojStudentSyncEvent'>;

/**
 * Ghi lệnh gỡ/bật role UNIOJ vào outbox, trong transaction của caller.
 * Chỉ học sinh đã có tài khoản UNIOJ (`uniojUsername`) mới có lệnh — điều này cũng
 * tự giới hạn ở instance IT, vì chỉ IT mới tạo tài khoản UNIOJ.
 */
export async function enqueueUniojRoleEvent(
  tx: SyncTx,
  student: { id: string; uniojUsername: string | null },
  reason: UniojRoleReason,
  occurredAt: Date = new Date(),
): Promise<void> {
  if (!student.uniojUsername) return;
  await tx.uniojStudentSyncEvent.create({
    data: {
      id: generateUlid(occurredAt.getTime()),
      externalId: student.id,
      action: reason === 'student_reactivated' ? 'activate' : 'deactivate',
      reason,
      occurredAt,
    },
  });
}

/** Đổi trạng thái học sinh → lệnh UNIOJ tương ứng; không đổi thì không gửi. */
export async function enqueueUniojStatusChange(
  tx: SyncTx,
  student: { id: string; uniojUsername: string | null; status: StudentStatus },
  nextStatus: StudentStatus | undefined,
): Promise<void> {
  if (nextStatus === undefined || nextStatus === student.status) return;
  await enqueueUniojRoleEvent(
    tx,
    student,
    nextStatus === StudentStatus.inactive
      ? 'student_inactive'
      : 'student_reactivated',
  );
}
