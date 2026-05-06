jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

jest.mock('../staff-ops/staff-operations-access.service', () => ({
  StaffOperationsAccessService: class StaffOperationsAccessServiceMock {},
}));

import { SessionReportingService } from './session-reporting.service';

type PrismaSqlQuery = {
  sql?: string;
  text?: string;
  statement?: string;
  strings?: readonly string[];
  values?: readonly unknown[];
};

describe('SessionReportingService', () => {
  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  let service: SessionReportingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([]);
    service = new SessionReportingService(mockPrisma as never, {} as never);
  });

  function getUnpaidSessionsQuery() {
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);

    return mockPrisma.$queryRaw.mock.calls[0][0] as PrismaSqlQuery;
  }

  function getSqlText(query: PrismaSqlQuery) {
    return (
      query.sql ??
      query.text ??
      query.statement ??
      query.strings?.join('?') ??
      ''
    ).replace(/\s+/g, ' ');
  }

  describe('getUnpaidSessionsByTeacherId', () => {
    it('aggregates from sessions and checks attendance with EXISTS', async () => {
      await service.getUnpaidSessionsByTeacherId('teacher-1', 30);

      const sql = getSqlText(getUnpaidSessionsQuery());

      expect(sql).toMatch(/FROM sessions JOIN classes/i);
      expect(sql).toMatch(
        /EXISTS\s*\(\s*SELECT\s+1\s+FROM attendance\s+WHERE attendance\.session_id = sessions\.id\s*\)/i,
      );
      expect(sql).not.toMatch(/FROM attendance\s+JOIN sessions/i);
      expect(sql).toMatch(/sessions\.teacher_payment_status = 'unpaid'/i);
    });

    it('falls back to the default date window for invalid days', async () => {
      await service.getUnpaidSessionsByTeacherId('teacher-1', -3);

      const query = getUnpaidSessionsQuery();

      expect(query.values).toEqual(['teacher-1', 13]);
    });
  });
});
