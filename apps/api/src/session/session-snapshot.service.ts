import { Injectable } from '@nestjs/common';

interface SessionSnapshotReader {
  session: {
    findUnique(args: unknown): Promise<unknown>;
  };
}

@Injectable()
export class SessionSnapshotService {
  async getSessionAuditSnapshot(
    db: SessionSnapshotReader,
    sessionId: string,
  ) {
    return db.session.findUnique({
      where: { id: sessionId },
      include: {
        class: true,
        teacher: true,
        attendance: {
          include: {
            student: true,
            transaction: true,
            customerCareStaff: true,
          },
          orderBy: [{ createdAt: 'asc' }, { studentId: 'asc' }],
        },
      },
    });
  }
}
