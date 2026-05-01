import { Prisma } from '../../generated/client';
import { StaffRole } from '../../generated/enums';

type PrismaLike = {
  roleTaxDeductionRate: {
    findFirst(args: unknown): Promise<{
      ratePercent: Prisma.Decimal | number | string;
    } | null>;
  };
  staffTaxDeductionOverride: {
    findFirst(args: unknown): Promise<{
      ratePercent: Prisma.Decimal | number | string;
    } | null>;
  };
  classTeacherOperatingDeductionRate?: {
    findFirst(args: unknown): Promise<{
      ratePercent: Prisma.Decimal | number | string;
    } | null>;
  };
};

export type DeductionAmounts = {
  grossAmount: number;
  taxDeductionAmount: number;
  operatingDeductionAmount: number;
  totalDeductionAmount: number;
  netAmount: number;
};

export function normalizePercent(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(100, Math.round(parsed * 100) / 100);
}

export function roundMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value);
}

export function parseMonthKeyToEffectiveDate(monthKey: string) {
  const trimmed = monthKey.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  return new Date(`${trimmed}-01T00:00:00.000Z`);
}

export async function resolveTaxDeductionRate(
  prisma: PrismaLike,
  params: {
    staffId: string;
    roleType: StaffRole;
    effectiveDate: Date;
  },
) {
  const staffOverride = await prisma.staffTaxDeductionOverride.findFirst({
    where: {
      staffId: params.staffId,
      roleType: params.roleType,
      effectiveFrom: {
        lte: params.effectiveDate,
      },
    },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
  });

  if (staffOverride) {
    return normalizePercent(staffOverride.ratePercent);
  }

  const roleDefault = await prisma.roleTaxDeductionRate.findFirst({
    where: {
      roleType: params.roleType,
      effectiveFrom: {
        lte: params.effectiveDate,
      },
    },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
  });

  return normalizePercent(roleDefault?.ratePercent);
}

/**
 * Dedupes concurrent in-flight lookups (e.g. Promise.all over attendance rows sharing the same staff).
 * Each distinct (staffId, roleType) triggers at most one resolveTaxDeductionRate chain per resolver instance.
 */
export function createMemoizedTaxDeductionResolver(
  prisma: PrismaLike,
  effectiveDate: Date,
) {
  const pendingByKey = new Map<string, Promise<number>>();
  return (staffId: string, roleType: StaffRole): Promise<number> => {
    const key = `${staffId}:${roleType}`;
    let pending = pendingByKey.get(key);
    if (!pending) {
      pending = resolveTaxDeductionRate(prisma, {
        staffId,
        roleType,
        effectiveDate,
      });
      pendingByKey.set(key, pending);
    }
    return pending;
  };
}

export async function resolveOperatingDeductionRate(
  prisma: PrismaLike,
  params: {
    classId: string;
    teacherId: string;
    effectiveDate: Date;
  },
) {
  if (!prisma.classTeacherOperatingDeductionRate) {
    return 0;
  }

  const operatingRate =
    await prisma.classTeacherOperatingDeductionRate.findFirst({
      where: {
        classId: params.classId,
        teacherId: params.teacherId,
        effectiveFrom: {
          lte: params.effectiveDate,
        },
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });

  return normalizePercent(operatingRate?.ratePercent);
}

export function calculateDeductionAmounts(params: {
  grossAmount: number;
  taxRatePercent?: number | null;
  operatingRatePercent?: number | null;
}) {
  const grossAmount = roundMoney(params.grossAmount);
  const taxDeductionAmount = roundMoney(
    (grossAmount * normalizePercent(params.taxRatePercent)) / 100,
  );
  const operatingDeductionAmount = roundMoney(
    (grossAmount * normalizePercent(params.operatingRatePercent)) / 100,
  );

  return {
    grossAmount,
    taxDeductionAmount,
    operatingDeductionAmount,
    totalDeductionAmount: taxDeductionAmount + operatingDeductionAmount,
    netAmount: grossAmount - taxDeductionAmount - operatingDeductionAmount,
  } satisfies DeductionAmounts;
}
