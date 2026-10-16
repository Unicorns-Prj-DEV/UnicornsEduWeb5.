import {
  buildAdminMonthlyReport,
  type MonthlyReportInput,
  type MonthlyReportStudentInput,
} from './monthly-report.service';

const monthStart = new Date('2026-09-01T00:00:00.000Z');
const monthEnd = new Date('2026-10-01T00:00:00.000Z');

function student(
  overrides: Partial<MonthlyReportStudentInput> & { id: string },
): MonthlyReportStudentInput {
  return {
    fullName: overrides.id.toUpperCase(),
    status: 'active',
    customerSource: 'tiktok',
    dropOutDate: null,
    dropOutReason: null,
    customerCareStaffId: 'cs-1',
    ...overrides,
  };
}

function buildInput(overrides: Partial<MonthlyReportInput> = {}) {
  const input: MonthlyReportInput = {
    month: '09',
    year: '2026',
    monthStart,
    monthEnd,
    generatedAt: new Date('2026-10-12T00:00:00.000Z'),
    students: [
      // Mới, còn học, lớp đầu thuộc khoá BASIC.
      student({ id: 'new-active' }),
      // Mới nhưng đã nghỉ → nghỉ sớm; đồng thời là học sinh nghỉ của tháng.
      student({
        id: 'new-dropped',
        status: 'inactive',
        dropOutDate: new Date('2026-09-20T00:00:00.000Z'),
        dropOutReason: 'Học thử không hợp',
      }),
      // Mới, chưa xếp lớp, không có nguồn, không có CSKH.
      student({
        id: 'new-unplaced',
        customerSource: null,
        customerCareStaffId: null,
      }),
      // Cũ, nghỉ trong tháng.
      student({
        id: 'old-dropped',
        status: 'inactive',
        dropOutDate: new Date('2026-09-05T00:00:00.000Z'),
        customerCareStaffId: 'cs-2',
      }),
      // Cũ, nghỉ tháng trước → không tính.
      student({
        id: 'old-dropped-august',
        status: 'inactive',
        dropOutDate: new Date('2026-08-30T00:00:00.000Z'),
      }),
      // Cũ, còn học, có nạp trong tháng.
      student({ id: 'old-active', customerCareStaffId: 'cs-2' }),
    ],
    firstTopUpInMonth: new Map([
      ['new-active', new Date('2026-09-03T02:00:00.000Z')],
      ['new-dropped', new Date('2026-09-10T02:00:00.000Z')],
      ['new-unplaced', new Date('2026-09-15T02:00:00.000Z')],
    ]),
    topUps: [
      {
        studentId: 'new-active',
        inMonthAmount: 3_000_000,
        inMonthCount: 2,
        toMonthEndAmount: 3_000_000,
      },
      {
        studentId: 'new-dropped',
        inMonthAmount: 500_000,
        inMonthCount: 1,
        toMonthEndAmount: 500_000,
      },
      {
        studentId: 'old-active',
        inMonthAmount: 2_000_000,
        inMonthCount: 1,
        toMonthEndAmount: 9_000_000,
      },
    ],
    firstClassByStudent: new Map([
      [
        'new-active',
        {
          studentId: 'new-active',
          className: 'B1',
          courseId: 'c-basic',
          courseName: 'BASIC',
        },
      ],
      [
        'new-dropped',
        {
          studentId: 'new-dropped',
          className: 'B2',
          courseId: 'c-basic',
          courseName: 'BASIC',
        },
      ],
    ]),
    latestClassByStudent: new Map([
      [
        'old-dropped',
        {
          studentId: 'old-dropped',
          className: 'A7',
          courseId: 'c-adv',
          courseName: 'ADVANCED',
        },
      ],
    ]),
    staffNames: new Map([
      ['cs-1', 'Nguyễn Ngọc Linh'],
      ['cs-2', 'Phan Đàm Thu Thảo'],
    ]),
    ...overrides,
  };
  return input;
}

describe('buildAdminMonthlyReport', () => {
  it('computes KPI with new = first top-up in month and early drop = new now inactive', () => {
    const report = buildAdminMonthlyReport(buildInput());

    expect(report.kpi).toEqual({
      totalTopUpInMonth: 5_500_000,
      topUpTransactionCount: 4,
      activeStudents: 3,
      newStudents: 3,
      droppedStudents: 2,
      netChange: 1,
      newStillActive: 2,
    });
  });

  it('builds the source × first-class course matrix with an unplaced column', () => {
    const report = buildAdminMonthlyReport(buildInput());

    expect(report.courses).toEqual([
      { courseId: 'c-basic', courseName: 'BASIC' },
    ]);
    expect(report.matrix).toEqual(
      expect.arrayContaining([
        {
          customerSource: 'tiktok',
          courseId: 'c-basic',
          newCount: 2,
          earlyDropCount: 1,
          paidCount: 2,
          totalTopUp: 3_500_000,
        },
        {
          customerSource: null,
          courseId: null,
          newCount: 1,
          earlyDropCount: 0,
          paidCount: 0,
          totalTopUp: 0,
        },
      ]),
    );
  });

  it('lists students dropped in the month by drop-out date', () => {
    const report = buildAdminMonthlyReport(buildInput());

    expect(report.droppedStudents.map((row) => row.studentId)).toEqual([
      'old-dropped',
      'new-dropped',
    ]);
    expect(report.droppedStudents[0]).toMatchObject({
      className: 'A7',
      customerCareStaffName: 'Phan Đàm Thu Thảo',
      dropOutDate: '2026-09-05',
    });
  });

  it('summarises per customer-care staff with in-month top-up and puts unassigned last', () => {
    const report = buildAdminMonthlyReport(buildInput());

    expect(report.customerCare.map((row) => row.staffId)).toEqual([
      'cs-1',
      'cs-2',
      null,
    ]);
    expect(report.customerCare[0]).toMatchObject({
      staffName: 'Nguyễn Ngọc Linh',
      activeStudents: 1,
      newStudents: 2,
      droppedStudents: 1,
      netChange: 1,
      earlyDropCount: 1,
      totalTopUpInMonth: 3_500_000,
      topUpTransactionCount: 3,
    });
    expect(report.customerCare[2]).toMatchObject({
      staffName: 'Chưa có CSKH',
      newStudents: 1,
    });
  });

  it('lists new students by first top-up date with early-drop details', () => {
    const report = buildAdminMonthlyReport(buildInput());

    expect(report.newStudents.map((row) => row.studentId)).toEqual([
      'new-active',
      'new-dropped',
      'new-unplaced',
    ]);
    expect(report.newStudents[1]).toMatchObject({
      isEarlyDrop: true,
      dropOutDate: '2026-09-20',
      courseName: 'BASIC',
    });
    expect(report.newStudents[2]).toMatchObject({
      className: null,
      courseId: null,
      totalTopUp: 0,
    });
  });
});
