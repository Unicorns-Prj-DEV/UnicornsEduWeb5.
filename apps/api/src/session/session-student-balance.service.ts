import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/client';

interface StudentBalanceChange {
  studentId: string;
  change: number;
}

interface TransactionClientLike {
  $executeRaw: (
    query: Prisma.Sql,
    ...values: unknown[]
  ) => Promise<unknown> | unknown;
}

@Injectable()
export class SessionStudentBalanceService {
  async applyBalanceChanges(
    tx: TransactionClientLike,
    balanceChanges: StudentBalanceChange[],
  ): Promise<void> {
    if (balanceChanges.length === 0) {
      return;
    }

    const balanceRows = balanceChanges.map(
      (balanceChange) =>
        Prisma.sql`(${balanceChange.studentId}:: text, ${balanceChange.change}:: integer)`,
    );

    await tx.$executeRaw(Prisma.sql`
      UPDATE student_info AS s
      SET account_balance = COALESCE(s.account_balance, 0) + balance_change.change
      FROM(
        VALUES ${Prisma.join(balanceRows)}
      ) AS balance_change(student_id, change)
      WHERE s.id = balance_change.student_id
    `);
  }
}
