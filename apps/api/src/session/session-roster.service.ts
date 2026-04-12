import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionValidationService } from './session-validation.service';

@Injectable()
export class SessionRosterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionValidationService: SessionValidationService,
  ) {}

  async assertAttendanceStudentsBelongToClass(
    classId: string,
    studentIds: string[],
  ) {
    if (studentIds.length === 0) {
      return new Map<string, number | null>();
    }

    const uniqueStudentIds = Array.from(new Set(studentIds));
    const studentRows = await this.prisma.studentClass.findMany({
      where: {
        classId,
        studentId: {
          in: uniqueStudentIds,
        },
      },
      select: {
        studentId: true,
        customStudentTuitionPerSession: true,
        class: {
          select: {
            studentTuitionPerSession: true,
            tuitionPackageTotal: true,
            tuitionPackageSession: true,
          },
        },
      },
    });

    if (studentRows.length !== uniqueStudentIds.length) {
      throw new BadRequestException(
        'attendance chỉ được phép chứa học sinh thuộc lớp học hiện tại.',
      );
    }

    return new Map(
      studentRows.map((studentRow) => [
        studentRow.studentId,
        this.sessionValidationService.resolveDefaultStudentTuitionPerSession({
          customTuitionPerSession: studentRow.customStudentTuitionPerSession,
          classTuitionPerSession: studentRow.class?.studentTuitionPerSession,
          classTuitionPackageTotal: studentRow.class?.tuitionPackageTotal,
          classTuitionPackageSession: studentRow.class?.tuitionPackageSession,
        }),
      ]),
    );
  }
}
