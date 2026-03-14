import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CfProblemTutorialService {
  constructor(private readonly prisma: PrismaService) {}

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
  ): Promise<{ tutorial: string | null }> {
    const row = await this.prisma.cfProblemTutorial.upsert({
      where: {
        contestId_problemIndex: { contestId, problemIndex },
      },
      create: { contestId, problemIndex, tutorial },
      update: { tutorial },
    });
    return { tutorial: row.tutorial };
  }
}
