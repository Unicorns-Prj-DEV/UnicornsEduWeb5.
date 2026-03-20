import { Injectable } from '@nestjs/common';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CfProblemTutorialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  async getTutorial(contestId: number, problemIndex: string): Promise<string | null> {
    const row = await this.prisma.cfProblemTutorial.findUnique({
      where: {
        contestId_problemIndex: { contestId, problemIndex },
      },
    });
    return row?.tutorial ?? null;
  }

  async upsertTutorial(
    contestId: number,
    problemIndex: string,
    tutorial: string | null,
    auditActor?: ActionHistoryActor,
  ): Promise<{ tutorial: string | null }> {
    return this.prisma.$transaction(async (tx) => {
      const beforeValue = await tx.cfProblemTutorial.findUnique({
        where: {
          contestId_problemIndex: { contestId, problemIndex },
        },
      });

      const row = await tx.cfProblemTutorial.upsert({
        where: {
          contestId_problemIndex: { contestId, problemIndex },
        },
        create: { contestId, problemIndex, tutorial },
        update: { tutorial },
      });

      if (auditActor) {
        if (beforeValue) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'cf_problem_tutorial',
            entityId: row.id,
            description: 'Cập nhật tutorial Codeforces',
            beforeValue,
            afterValue: row,
          });
        } else {
          await this.actionHistoryService.recordCreate(tx, {
            actor: auditActor,
            entityType: 'cf_problem_tutorial',
            entityId: row.id,
            description: 'Tạo tutorial Codeforces',
            afterValue: row,
          });
        }
      }

      return { tutorial: row.tutorial };
    });
  }
}
