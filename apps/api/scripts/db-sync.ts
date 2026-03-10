/**
 * Sync prepared seed data to Supabase/Postgres via Prisma.
 * Optional clean start: truncate tables in safe order before insert.
 */
import { PrismaClient } from '../generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { SeedData } from './seed-types';

let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required for db-sync');
    }
    const adapter = new PrismaPg({ connectionString: url });
    _prisma = new PrismaClient({
      adapter,
      log: ['error'],
      errorFormat: 'minimal',
    });
  }
  return _prisma;
}

/** Tables that have FK dependencies: truncate in reverse dependency order. */
const TRUNCATE_ORDER = [
  'lesson_outputs',
  'staff_lesson_task',
  'lesson_resources',
  'lesson_task',
  'documents',
  'action_history',
  'class_surveys',
  'cost_extend',
  'dashboard_cache',
  'staff_monthly_stats',
  'customer_care_service',
  'wallet_transactions_history',
  'bonuses',
  'attendance',
  'sessions',
  'student_classes',
  'class_teachers',
  'classes',
  'users',
  'student_info',
  'staff_info',
];

export async function truncateAll(): Promise<void> {
  const prisma = getPrisma();
  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
  try {
    for (const table of TRUNCATE_ORDER) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  } finally {
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
  }
}

function toDecimal(n: number): { toString: () => string } {
  return { toString: () => String(n) };
}

export async function syncToDb(data: SeedData, cleanStart: boolean): Promise<void> {
  const prisma = getPrisma();
  if (cleanStart) {
    await truncateAll();
  }

  const { staffInfo, studentInfo, users, classes, classTeachers, studentClasses, sessions, attendance, bonuses, walletTransactionsHistory, customerCareService, staffMonthlyStats, dashboardCache, costExtend, classSurveys, actionHistory, documents, lessonTask, staffLessonTask, lessonResources, lessonOutputs } = data;

  await prisma.staffInfo.createMany({
    data: staffInfo.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      birthDate: r.birthDate ?? undefined,
      university: r.university ?? undefined,
      highSchool: r.highSchool ?? undefined,
      specialization: r.specialization ?? undefined,
      bankAccount: r.bankAccount ?? undefined,
      bankQrLink: r.bankQrLink ?? undefined,
      roles: r.roles as object,
      status: r.status,
    })),
    skipDuplicates: true,
  });

  await prisma.studentInfo.createMany({
    data: studentInfo.map((r) => ({
      id: r.id,
      fullName: r.fullName,
      email: r.email ?? undefined,
      school: r.school ?? undefined,
      province: r.province ?? undefined,
      birthYear: r.birthYear ?? undefined,
      parentName: r.parentName ?? undefined,
      parentPhone: r.parentPhone ?? undefined,
      status: r.status,
      gender: r.gender,
      goal: r.goal ?? undefined,
      dropOutDate: r.dropOutDate ?? undefined,
    })),
    skipDuplicates: true,
  });

  for (const r of users) {
    await prisma.user.create({
      data: {
        id: r.id,
        email: r.email,
        phone: r.phone ?? undefined,
        passwordHash: r.passwordHash,
        name: r.name ?? undefined,
        roleType: r.roleType,
        province: r.province ?? undefined,
        status: r.status,
        linkId: r.linkId ?? undefined,
        accountHandle: r.accountHandle ?? undefined,
        emailVerified: r.emailVerified,
        phoneVerified: r.phoneVerified,
        refreshToken: r.refreshToken ?? undefined,
        studentId: r.studentId ?? undefined,
        staffId: r.staffId ?? undefined,
      },
    }).catch((e: { code?: string }) => {
      if (e?.code === 'P2002') return; // unique violation, skip
      throw e;
    });
  }

  await prisma.class.createMany({
    data: classes.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      maxStudents: r.maxStudents,
      allowancePerSessionPerStudent: r.allowancePerSessionPerStudent,
      maxAllowancePerSession: r.maxAllowancePerSession ?? undefined,
      scaleAmount: r.scaleAmount ?? undefined,
      schedule: r.schedule as object,
      studentTuitionPerSession: r.studentTuitionPerSession ?? undefined,
      tuitionPackageTotal: r.tuitionPackageTotal ?? undefined,
      tuitionPackageSession: r.tuitionPackageSession ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.classTeacher.createMany({
    data: classTeachers.map((r) => ({
      id: r.id,
      classId: r.classId,
      teacherId: r.teacherId,
      customAllowance: r.customAllowance ?? undefined,
      status: r.status ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.studentClass.createMany({
    data: studentClasses.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      classId: r.classId,
      customStudentTuitionPerSession: r.customStudentTuitionPerSession ?? undefined,
      customTuitionPackageTotal: r.customTuitionPackageTotal ?? undefined,
      customTuitionPackageSession: r.customTuitionPackageSession ?? undefined,
      totalAttendedSession: r.totalAttendedSession ?? undefined,
    })),
    skipDuplicates: true,
  });

  for (const r of sessions) {
    await prisma.session.create({
      data: {
        id: r.id,
        teacherId: r.teacherId,
        classId: r.classId,
        allowanceAmount: r.allowanceAmount ?? undefined,
        teacherPaymentStatus: r.teacherPaymentStatus,
        date: r.date,
        startTime: r.startTime ?? undefined,
        endTime: r.endTime ?? undefined,
        coefficient: r.coefficient,
        notes: r.notes ?? undefined,
        tuitionFee: r.tuitionFee ?? undefined,
      },
    }).catch((e: { code?: string }) => {
      if (e?.code === 'P2002') return;
      throw e;
    });
  }

  await prisma.attendance.createMany({
    data: attendance.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      studentId: r.studentId,
      status: r.status,
      notes: r.notes ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.bonus.createMany({
    data: bonuses.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      workType: r.workType,
      amount: r.amount,
      status: r.status,
      note: r.note ?? undefined,
      month: r.month,
    })),
    skipDuplicates: true,
  });

  for (const r of walletTransactionsHistory) {
    await prisma.walletTransactionsHistory.create({
      data: {
        id: r.id,
        studentId: r.studentId,
        type: r.type,
        amount: r.amount,
        note: r.note ?? undefined,
        date: r.date,
        customerCareStaffId: r.customerCareStaffId,
        customerCareProfitPercent: r.customerCareProfitPercent ?? undefined,
        customerCarePaymentStatus: r.customerCarePaymentStatus ?? undefined,
      },
    }).catch((e: { code?: string }) => {
      if (e?.code === 'P2002') return;
      throw e;
    });
  }

  await prisma.customerCareService.createMany({
    data: customerCareService.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      staffId: r.staffId,
      profitPercent: r.profitPercent ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.staffMonthlyStat.createMany({
    data: staffMonthlyStats.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      month: r.month,
      classesTotalMonth: r.classesTotalMonth ?? undefined,
      classesTotalPaid: r.classesTotalPaid ?? undefined,
      classesTotalUnpaid: r.classesTotalUnpaid ?? undefined,
      workItemsTotalMonth: r.workItemsTotalMonth ?? undefined,
      workItemsTotalPaid: r.workItemsTotalPaid ?? undefined,
      workItemsTotalUnpaid: r.workItemsTotalUnpaid ?? undefined,
      bonusesTotalMonth: r.bonusesTotalMonth ?? undefined,
      bonusesTotalPaid: r.bonusesTotalPaid ?? undefined,
      bonusesTotalUnpaid: r.bonusesTotalUnpaid ?? undefined,
      totalMonthAll: r.totalMonthAll ?? undefined,
      totalPaidAll: r.totalPaidAll ?? undefined,
      totalUnpaidAll: r.totalUnpaidAll ?? undefined,
      calculatedAt: r.calculatedAt ?? undefined,
    })),
    skipDuplicates: true,
  });

  for (const r of dashboardCache) {
    await prisma.dashboardCache.create({
      data: {
        cacheKey: r.cacheKey,
        cacheType: r.cacheType,
        data: r.data as object,
        expiresAt: r.expiresAt,
      },
    }).catch((e: { code?: string }) => {
      if (e?.code === 'P2002') return;
      throw e;
    });
  }

  await prisma.costExtend.createMany({
    data: costExtend.map((r) => ({
      id: r.id,
      month: r.month ?? undefined,
      category: r.category ?? undefined,
      amount: r.amount ?? undefined,
      date: r.date ?? undefined,
      status: r.status ?? undefined,
    })),
    skipDuplicates: true,
  });

  for (const r of classSurveys) {
    await prisma.classSurvey.create({
      data: {
        id: r.id,
        classId: r.classId ?? undefined,
        testNumber: r.testNumber,
        teacherId: r.teacherId ?? undefined,
        reportDate: r.reportDate,
        content: r.content,
      },
    }).catch((e: { code?: string }) => {
      if (e?.code === 'P2002') return;
      throw e;
    });
  }

  await prisma.actionHistory.createMany({
    data: actionHistory.map((r) => ({
      id: r.id,
      userId: r.userId ?? undefined,
      userEmail: r.userEmail ?? undefined,
      entityId: r.entityId ?? undefined,
      entityType: r.entityType ?? undefined,
      actionType: r.actionType ?? undefined,
      beforeValue: r.beforeValue as object | undefined,
      afterValue: r.afterValue as object | undefined,
      changedFields: r.changedFields as object | undefined,
      description: r.description ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.document.createMany({
    data: documents.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? undefined,
      fileUrl: r.fileUrl,
      tags: r.tags as object,
      uploadedBy: r.uploadedBy ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.lessonTask.createMany({
    data: lessonTask.map((r) => ({
      id: r.id,
      title: r.title ?? undefined,
      description: r.description ?? undefined,
      status: r.status,
      priority: r.priority,
      dueDate: r.dueDate ?? undefined,
      createdBy: r.createdBy ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.staffLessonTask.createMany({
    data: staffLessonTask.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      lessonTaskId: r.lessonTaskId,
    })),
    skipDuplicates: true,
  });

  await prisma.lessonResource.createMany({
    data: lessonResources.map((r) => ({
      id: r.id,
      resourceLink: r.resourceLink,
      title: r.title ?? undefined,
      description: r.description ?? undefined,
      tags: r.tags as object,
      createdBy: r.createdBy ?? undefined,
    })),
    skipDuplicates: true,
  });

  await prisma.lessonOutput.createMany({
    data: lessonOutputs.map((r) => ({
      id: r.id,
      tag: r.tag ?? undefined,
      level: r.level ?? undefined,
      lessonName: r.lessonName,
      originalTitle: r.originalTitle ?? undefined,
      source: r.source ?? undefined,
      originalLink: r.originalLink ?? undefined,
      cost: r.cost,
      date: r.date,
      staffPaymentStatus: r.staffPaymentStatus,
      contestUploaded: r.contestUploaded ?? undefined,
      link: r.link ?? undefined,
      staffId: r.staffId ?? undefined,
    })),
    skipDuplicates: true,
  });
}

export async function disconnect(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}
