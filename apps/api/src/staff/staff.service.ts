import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/client';
import {
  ActionHistoryActor,
  ActionHistoryService,
} from '../action-history/action-history.service';
import {
  PaymentStatus,
  StaffRole,
  StaffStatus,
  UserRole,
} from 'generated/enums';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import {
  CreateStaffDto,
  type StaffDepositPaymentPreviewClassDto,
  type StaffDepositPaymentPreviewDto,
  type StaffDepositPaymentPreviewSessionDto,
  type StaffDepositPaymentPreviewTotalsDto,
  type StaffPayDepositSessionsResultDto,
  type StaffPayAllPaymentsResultDto,
  type StaffPaymentPreviewDto,
  type StaffPaymentPreviewItemDto,
  type StaffPaymentPreviewSectionDto,
  type StaffPaymentPreviewSourceDto,
  type StaffPaymentPreviewTotalsDto,
  SearchCustomerCareStaffDto,
  type StaffIncomeAmountSummaryDto,
  type StaffIncomeClassSummaryDto,
  type StaffIncomeDepositClassSummaryDto,
  type StaffIncomeRoleSummaryDto,
  type StaffIncomeSummaryDto,
  UpdateStaffDto,
} from 'src/dtos/staff.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createSignedStorageUrl,
  getSupabaseAdminClient,
  type UploadableFile,
  validateImageFile,
} from 'src/storage/supabase-storage';
import {
  getPreferredUserFullName,
  splitFullName,
} from 'src/common/user-name.util';
import {
  normalizePercent,
  resolveTaxDeductionRate,
  roundMoney,
} from 'src/payroll/deduction-rates';

/** Prisma expects DateTime; normalize date-only string (YYYY-MM-DD) to Date. */
function toDateOrNull(
  value: string | Date | null | undefined,
): Date | null | undefined {
  if (value == null) return value;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return undefined;
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function buildNameSearchWhere(search?: string): Prisma.StaffInfoWhereInput {
  const tokens = (search ?? '')
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (tokens.length === 0) {
    return {};
  }

  return {
    AND: tokens.map((token) => ({
      OR: [
        {
          user: {
            first_name: {
              contains: token,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            last_name: {
              contains: token,
              mode: 'insensitive',
            },
          },
        },
      ],
    })),
  };
}

const STAFF_NAME_USER_SELECT = {
  first_name: true,
  last_name: true,
  accountHandle: true,
  email: true,
} satisfies Prisma.UserSelect;

type StaffNameUser = Prisma.UserGetPayload<{
  select: typeof STAFF_NAME_USER_SELECT;
}>;

const STAFF_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  teacher: 'Giáo viên',
  assistant: 'Trợ lí',
  lesson_plan: 'Giáo án',
  lesson_plan_head: 'Trưởng giáo án',
  accountant: 'Kế toán',
  communication: 'Truyền thông',
  technical: 'Kỹ thuật',
  customer_care: 'CSKH',
};

const EXTRA_ALLOWANCE_BACKED_OTHER_ROLES = new Set<StaffRole>([
  StaffRole.assistant,
  StaffRole.accountant,
  StaffRole.communication,
  StaffRole.technical,
]);

const DEPOSIT_PAYMENT_STATUSES = ['deposit', 'deposite', 'coc', 'cọc'] as const;
const NORMALIZED_DEPOSIT_PAYMENT_STATUSES = Array.from(
  new Set(
    DEPOSIT_PAYMENT_STATUSES.map((status) => status.trim().toLowerCase()),
  ),
);

function isDepositPaymentStatus(status: string | null | undefined) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();
  return DEPOSIT_PAYMENT_STATUSES.some((value) => value === normalized);
}

function normalizeMoneyAmount(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function makeAmountSummary(): StaffIncomeAmountSummaryDto {
  return {
    total: 0,
    paid: 0,
    unpaid: 0,
  };
}

function mergeAmountSummary(
  summary: StaffIncomeAmountSummaryDto,
  addition: StaffIncomeAmountSummaryDto,
): StaffIncomeAmountSummaryDto {
  return {
    total: summary.total + addition.total,
    paid: summary.paid + addition.paid,
    unpaid: summary.unpaid + addition.unpaid,
  };
}

function summarizePaymentRows<T extends { paymentStatus: string | null }>(
  rows: T[],
  getAmount: (row: T) => number,
): StaffIncomeAmountSummaryDto {
  return rows.reduce<StaffIncomeAmountSummaryDto>((summary, row) => {
    const amount = getAmount(row);
    const isPaid = String(row.paymentStatus ?? '').toLowerCase() === 'paid';

    return {
      total: summary.total + amount,
      paid: summary.paid + (isPaid ? amount : 0),
      unpaid: summary.unpaid + (isPaid ? 0 : amount),
    };
  }, makeAmountSummary());
}

function addAmountToSummary(
  summary: StaffIncomeAmountSummaryDto,
  paymentStatus: string | null,
  amount: number,
) {
  const normalizedAmount = normalizeMoneyAmount(amount);
  const isPaid = String(paymentStatus ?? '').toLowerCase() === 'paid';

  summary.total += normalizedAmount;
  summary.paid += isPaid ? normalizedAmount : 0;
  summary.unpaid += isPaid ? 0 : normalizedAmount;
}

type SourcePaymentTaxBucketRow = {
  paymentStatus: string | null;
  grossAmount: number | string | null;
  taxRatePercent: number | string | null;
  operatingAmount?: number | string | null;
  taxableBaseAmount?: number | string | null;
};

function calculateBucketTaxAmount(row: SourcePaymentTaxBucketRow) {
  const taxableBaseAmount = normalizeMoneyAmount(
    row.taxableBaseAmount ?? row.grossAmount,
  );
  return roundMoney(
    (taxableBaseAmount * normalizePercent(row.taxRatePercent)) / 100,
  );
}

function calculateBucketNetAmount(row: SourcePaymentTaxBucketRow) {
  const grossAmount = normalizeMoneyAmount(row.grossAmount);
  const operatingAmount = normalizeMoneyAmount(row.operatingAmount);
  const taxAmount = calculateBucketTaxAmount(row);

  return grossAmount - operatingAmount - taxAmount;
}

function summarizeSourceBucketRows<T extends SourcePaymentTaxBucketRow>(
  rows: T[],
) {
  const grossTotals = makeAmountSummary();
  const taxTotals = makeAmountSummary();
  const operatingTotals = makeAmountSummary();
  const totalDeductionTotals = makeAmountSummary();
  const netTotals = makeAmountSummary();

  rows.forEach((row) => {
    const grossAmount = normalizeMoneyAmount(row.grossAmount);
    const operatingAmount = normalizeMoneyAmount(row.operatingAmount);
    const taxAmount = calculateBucketTaxAmount(row);
    const totalDeductionAmount = taxAmount + operatingAmount;
    const netAmount = grossAmount - totalDeductionAmount;

    addAmountToSummary(grossTotals, row.paymentStatus, grossAmount);
    addAmountToSummary(taxTotals, row.paymentStatus, taxAmount);
    addAmountToSummary(operatingTotals, row.paymentStatus, operatingAmount);
    addAmountToSummary(
      totalDeductionTotals,
      row.paymentStatus,
      totalDeductionAmount,
    );
    addAmountToSummary(netTotals, row.paymentStatus, netAmount);
  });

  return {
    grossTotals,
    taxTotals,
    operatingTotals,
    totalDeductionTotals,
    netTotals,
  };
}

function buildMonthRange(month: string, year: string) {
  if (!/^\d{4}$/.test(year)) {
    throw new BadRequestException('year must use YYYY format.');
  }

  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    throw new BadRequestException('month must use 01-12 format.');
  }

  const parsedYear = Number(year);
  const parsedMonthIndex = Number(month) - 1;
  const start = new Date(parsedYear, parsedMonthIndex, 1);
  const end = new Date(parsedYear, parsedMonthIndex + 1, 1);

  return {
    monthKey: `${year}-${month}`,
    start,
    end,
    yearStart: new Date(parsedYear, 0, 1),
    yearEnd: new Date(parsedYear + 1, 0, 1),
  };
}

function buildYearRange(year: string) {
  if (!/^\d{4}$/.test(year)) {
    throw new BadRequestException('year must use YYYY format.');
  }

  const parsedYear = Number(year);

  return {
    yearKey: year,
    start: new Date(parsedYear, 0, 1),
    end: new Date(parsedYear + 1, 0, 1),
  };
}

function buildRecentWindow(days?: number) {
  const safeDays =
    Number.isInteger(days) && (days as number) > 0 ? (days as number) : 14;
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - safeDays);

  return {
    days: safeDays,
    start,
    end,
  };
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

type TeacherAllowanceByClassStatusRow = {
  classId: string;
  className: string;
  teacherPaymentStatus: string | null;
  grossAllowance: number | string | null;
  operatingAmount: number | string | null;
  totalAllowance: number | string | null;
};

type TeacherAllowanceByClassRow = {
  classId: string;
  className: string;
  grossAllowance: number | string | null;
  operatingAmount: number | string | null;
  totalAllowance: number | string | null;
};

type ExtraAllowanceRoleTaxBucketRow = SourcePaymentTaxBucketRow & {
  roleType: StaffRole;
};

type StaffUnpaidTotalRow = {
  staffId: string;
  totalUnpaid: number | string | null;
};

type DepositSessionRow = {
  id: string;
  classId: string;
  className: string | null;
  date: Date | string;
  teacherPaymentStatus: string | null;
  teacherAllowanceTotal: number | string | null;
};

type TeacherPaymentPreviewRow = {
  id: string;
  classId: string;
  className: string | null;
  date: Date | string;
  paymentStatus: string | null;
  grossAmount: number | string | null;
  operatingAmount: number | string | null;
  taxableBaseAmount: number | string | null;
};

type StaffPaymentSourceType =
  | 'teacher_session'
  | 'customer_care'
  | 'assistant_share'
  | 'lesson_output'
  | 'extra_allowance'
  | 'bonus';

type StaffPaymentPreviewRecord = {
  id: string;
  role: StaffRole | null;
  sourceType: StaffPaymentSourceType;
  sourceLabel: string;
  label: string;
  secondaryLabel: string | null;
  date: string | null;
  currentStatus: string | null;
  grossAmount: number;
  operatingAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  netAmount: number;
};

type StaffPaymentPreviewDraftRecord = Omit<
  StaffPaymentPreviewRecord,
  'taxRatePercent' | 'taxAmount' | 'netAmount'
> & {
  taxableBaseAmount?: number;
};

type StaffDepositPaymentPreviewSessionRecord = {
  id: string;
  classId: string;
  className: string;
  date: string;
  currentStatus: string | null;
  preTaxAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  netAmount: number;
};

type StaffPaymentPreviewSourceBucket = StaffPaymentPreviewSourceDto & {
  sortOrder: number;
};

type StaffPaymentPreviewSectionBucket = StaffPaymentPreviewSectionDto & {
  sortOrder: number;
  sourceBuckets: Map<string, StaffPaymentPreviewSourceBucket>;
};

type StaffPaymentSourceResult = {
  sourceType: StaffPaymentSourceType;
  sourceLabel: string;
  updatedCount: number;
};

type StaffAuditClient = Prisma.TransactionClient | PrismaService;
type StaffPaymentClient = Prisma.TransactionClient | PrismaService;

const CCCD_STORAGE_BUCKET = 'id-cards';
const CCCD_SIGNED_URL_TTL_SECONDS = 60 * 60;

const STAFF_PAYMENT_SOURCE_ORDER: Record<StaffPaymentSourceType, number> = {
  teacher_session: 10,
  customer_care: 20,
  assistant_share: 30,
  lesson_output: 40,
  extra_allowance: 50,
  bonus: 60,
};

function makeDepositPaymentPreviewTotals(): StaffDepositPaymentPreviewTotalsDto {
  return {
    preTaxTotal: 0,
    taxTotal: 0,
    netTotal: 0,
    itemCount: 0,
  };
}

function addDepositPaymentPreviewTotals(
  totals: StaffDepositPaymentPreviewTotalsDto,
  record: Pick<
    StaffDepositPaymentPreviewSessionRecord,
    'preTaxAmount' | 'taxAmount' | 'netAmount'
  >,
) {
  totals.preTaxTotal += record.preTaxAmount;
  totals.taxTotal += record.taxAmount;
  totals.netTotal += record.netAmount;
  totals.itemCount += 1;
}

function makePaymentPreviewTotals(): StaffPaymentPreviewTotalsDto {
  return {
    grossTotal: 0,
    operatingTotal: 0,
    taxTotal: 0,
    netTotal: 0,
    itemCount: 0,
  };
}

function addPaymentPreviewRecordTotals(
  totals: StaffPaymentPreviewTotalsDto,
  record: StaffPaymentPreviewRecord,
) {
  totals.grossTotal += record.grossAmount;
  totals.operatingTotal += record.operatingAmount;
  totals.taxTotal += record.taxAmount;
  totals.netTotal += record.netAmount;
  totals.itemCount += 1;
}

function toIsoDateString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
}

function calculateTaxAmount(grossAmount: number, taxRatePercent: number) {
  return roundMoney((grossAmount * normalizePercent(taxRatePercent)) / 100);
}

function comparePaymentPreviewItems(
  left: StaffPaymentPreviewItemDto,
  right: StaffPaymentPreviewItemDto,
) {
  const leftTime = left.date ? Date.parse(left.date) : Number.NEGATIVE_INFINITY;
  const rightTime = right.date
    ? Date.parse(right.date)
    : Number.NEGATIVE_INFINITY;

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return left.label.localeCompare(right.label, 'vi');
}

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionHistoryService: ActionHistoryService,
  ) {}

  private validateCccdImageFile(
    file: UploadableFile | undefined,
    fieldLabel: string,
  ) {
    validateImageFile(file, fieldLabel);
  }

  private async createCccdSignedUrl(path?: string | null) {
    return createSignedStorageUrl({
      bucket: CCCD_STORAGE_BUCKET,
      path,
      expiresIn: CCCD_SIGNED_URL_TTL_SECONDS,
    });
  }

  async attachCccdImageUrls<
    T extends { cccdFrontPath?: string | null; cccdBackPath?: string | null },
  >(
    record: T,
  ): Promise<T & { cccdFrontUrl: string | null; cccdBackUrl: string | null }> {
    const [cccdFrontUrl, cccdBackUrl] = await Promise.all([
      this.createCccdSignedUrl(record.cccdFrontPath),
      this.createCccdSignedUrl(record.cccdBackPath),
    ]);

    return {
      ...record,
      cccdFrontUrl,
      cccdBackUrl,
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private isCccdNumberUniqueConstraint(error: unknown) {
    if (!this.isUniqueConstraintError(error)) {
      return false;
    }

    const target = (error as { meta?: { target?: unknown } }).meta?.target;
    if (Array.isArray(target)) {
      return target.some((item) => String(item).includes('cccd_number'));
    }

    return typeof target === 'string' && target.includes('cccd_number');
  }

  private getStaffAuditSnapshot(db: StaffAuditClient, staffId: string) {
    return db.staffInfo.findUnique({
      where: { id: staffId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            first_name: true,
            last_name: true,
            accountHandle: true,
            province: true,
            roleType: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            linkId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        classTeachers: {
          select: {
            customAllowance: true,
            class: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  private resolveStaffFullName(user?: StaffNameUser | null) {
    return getPreferredUserFullName(user) ?? '';
  }

  private attachDerivedStaffFullName<
    T extends {
      user?: (StaffNameUser & Record<string, unknown>) | null;
    },
  >(staff: T) {
    const fullName = this.resolveStaffFullName(staff.user);

    return {
      ...staff,
      fullName,
      user: staff.user
        ? {
            ...staff.user,
            fullName,
          }
        : staff.user,
    };
  }

  private normalizeStaffUserNameInput(data: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  }) {
    if (data.full_name !== undefined) {
      const normalizedFullName = data.full_name.trim();
      if (!normalizedFullName) {
        throw new BadRequestException('Tên nhân sự không được để trống.');
      }

      return splitFullName(normalizedFullName);
    }

    const payload: {
      first_name?: string;
      last_name?: string | null;
    } = {};

    if (data.first_name !== undefined) {
      const firstName = data.first_name.trim();
      if (!firstName) {
        throw new BadRequestException('first_name không được để trống.');
      }
      payload.first_name = firstName;
    }

    if (data.last_name !== undefined) {
      const lastName = data.last_name.trim();
      payload.last_name = lastName || null;
    }

    return payload;
  }

  async searchCustomerCareStaff(query: SearchCustomerCareStaffDto) {
    const limit =
      Number.isInteger(query.limit) && (query.limit as number) >= 1
        ? Math.min(query.limit as number, 50)
        : 20;
    const nameSearchWhere = buildNameSearchWhere(query.search);

    const rows = await this.prisma.staffInfo.findMany({
      where: {
        roles: {
          hasSome: [StaffRole.customer_care],
        },
        ...nameSearchWhere,
      },
      select: {
        id: true,
        status: true,
        roles: true,
        user: {
          select: {
            first_name: true,
            last_name: true,
            accountHandle: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { user: { first_name: 'asc' } },
        { user: { last_name: 'asc' } },
      ],
      take: limit,
    });

    return rows.map(({ user, ...staff }) => ({
      ...staff,
      fullName: this.resolveStaffFullName(user),
    }));
  }

  async searchAssistantStaff(query: SearchCustomerCareStaffDto) {
    const limit =
      Number.isInteger(query.limit) && (query.limit as number) >= 1
        ? Math.min(query.limit as number, 50)
        : 20;
    const nameSearchWhere = buildNameSearchWhere(query.search);

    const rows = await this.prisma.staffInfo.findMany({
      where: {
        roles: {
          hasSome: [StaffRole.assistant],
        },
        status: StaffStatus.active,
        ...nameSearchWhere,
      },
      select: {
        id: true,
        status: true,
        roles: true,
        user: {
          select: {
            first_name: true,
            last_name: true,
            accountHandle: true,
            email: true,
          },
        },
      },
      orderBy: [
        { user: { first_name: 'asc' } },
        { user: { last_name: 'asc' } },
      ],
      take: limit,
    });

    return rows.map(({ user, ...staff }) => ({
      ...staff,
      fullName: this.resolveStaffFullName(user),
    }));
  }

  private getUserEligibilityForStaffAssignment(user: {
    roleType: UserRole;
    staffInfo: { id: string } | null;
  }) {
    if (user.staffInfo) {
      return {
        isEligible: false,
        ineligibleReason: 'User này đã có hồ sơ nhân sự.',
      };
    }

    if (user.roleType !== UserRole.guest && user.roleType !== UserRole.staff) {
      return {
        isEligible: false,
        ineligibleReason:
          'Chỉ có thể gán gia sư cho user đang có role guest hoặc staff.',
      };
    }

    return {
      isEligible: true,
      ineligibleReason: null,
    };
  }

  async searchAssignableUsersByEmail(email: string) {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length < 2) {
      throw new BadRequestException('Email tìm kiếm phải có ít nhất 2 ký tự.');
    }

    const users = await this.prisma.user.findMany({
      where: {
        email: {
          contains: trimmedEmail,
          mode: 'insensitive',
        },
      },
      take: 8,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        accountHandle: true,
        province: true,
        roleType: true,
        status: true,
        first_name: true,
        last_name: true,
        staffInfo: {
          select: {
            id: true,
          },
        },
      },
    });

    return users
      .map((user) => {
        const eligibility = this.getUserEligibilityForStaffAssignment(user);

        return {
          id: user.id,
          email: user.email,
          accountHandle: user.accountHandle,
          province: user.province,
          roleType: user.roleType,
          status: user.status,
          fullName: getPreferredUserFullName(user),
          hasStaffProfile: Boolean(user.staffInfo),
          staffId: user.staffInfo?.id ?? null,
          isEligible: eligibility.isEligible,
          ineligibleReason: eligibility.ineligibleReason,
        };
      })
      .sort((a, b) => {
        const aExact = a.email.toLowerCase() === trimmedEmail.toLowerCase();
        const bExact = b.email.toLowerCase() === trimmedEmail.toLowerCase();

        if (aExact === bExact) {
          return a.email.localeCompare(b.email);
        }

        return aExact ? -1 : 1;
      });
  }

  async getStaff(
    query: PaginationQueryDto & {
      search?: string;
      status?: string;
      classId?: string;
      className?: string;
      province?: string;
      university?: string;
      highSchool?: string;
      role?: string;
    },
  ) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;
    const normalizedStatus = query.status?.trim();
    const trimmedClassId = query.classId?.trim();
    const trimmedClassName = query.className?.trim();
    const trimmedProvince = query.province?.trim();
    const trimmedUniversity = query.university?.trim();
    const trimmedHighSchool = query.highSchool?.trim();
    const trimmedRole = query.role?.trim();
    const statusFilter: StaffStatus | undefined =
      normalizedStatus === 'active'
        ? StaffStatus.active
        : normalizedStatus === 'inactive'
          ? StaffStatus.inactive
          : undefined;
    const roleFilter: StaffRole | undefined = Object.values(StaffRole).includes(
      trimmedRole as StaffRole,
    )
      ? (trimmedRole as StaffRole)
      : undefined;

    const where: Prisma.StaffInfoWhereInput = {
      ...buildNameSearchWhere(query.search),
      ...(trimmedUniversity
        ? {
            university: {
              contains: trimmedUniversity,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedHighSchool
        ? {
            highSchool: {
              contains: trimmedHighSchool,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(roleFilter
        ? {
            roles: {
              has: roleFilter,
            },
          }
        : {}),
      ...(trimmedClassId
        ? {
            classTeachers: {
              some: {
                classId: trimmedClassId,
              },
            },
          }
        : {}),
      ...(trimmedClassName
        ? {
            classTeachers: {
              some: {
                class: {
                  name: {
                    contains: trimmedClassName,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          }
        : {}),
      ...(trimmedProvince
        ? {
            user: {
              province: {
                contains: trimmedProvince,
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
    };

    const total = await this.prisma.staffInfo.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.staffInfo.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          status: 'asc',
        },
        {
          user: {
            first_name: 'asc',
          },
        },
        {
          user: {
            last_name: 'asc',
          },
        },
      ],
      include: {
        user: {
          select: {
            province: true,
            first_name: true,
            last_name: true,
            accountHandle: true,
            email: true,
          },
        },
        classTeachers: {
          include: { class: { select: { id: true, name: true } } },
        },
      },
    });
    const unpaidTotalsByStaffId = await this.getUnpaidTotalsByStaffIds(
      data.map((staff) => staff.id),
    );

    return {
      data: data.map((staff) => ({
        ...staff,
        fullName: this.resolveStaffFullName(staff.user),
        unpaidAmountTotal: unpaidTotalsByStaffId.get(staff.id) ?? 0,
      })),
      meta: {
        total,
        page: safePage,
        limit,
      },
    };
  }

  async searchStaffOptions(query: { search?: string; limit?: number }) {
    const limit =
      typeof query.limit === 'number'
        ? Math.min(Math.max(query.limit, 1), 50)
        : 20;

    const rows = await this.prisma.staffInfo.findMany({
      where: buildNameSearchWhere(query.search),
      take: limit,
      orderBy: [
        { user: { first_name: 'asc' } },
        { user: { last_name: 'asc' } },
      ],
      select: {
        id: true,
        roles: true,
        status: true,
        user: {
          select: {
            first_name: true,
            last_name: true,
            accountHandle: true,
            email: true,
          },
        },
      },
    });

    return rows.map(({ user, ...staff }) => ({
      ...staff,
      fullName: this.resolveStaffFullName(user),
    }));
  }

  private buildTeacherSessionAllowanceCte(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
    sessionIds?: string[];
  }) {
    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`sessions.teacher_id = ${params.teacherId}`,
      Prisma.sql`sessions.date >= ${params.start}`,
      Prisma.sql`sessions.date < ${params.end}`,
    ];

    const normalizedPaymentStatuses = (params.teacherPaymentStatuses ?? [])
      .map((status) => status.trim().toLowerCase())
      .filter((status) => status.length > 0);

    if (normalizedPaymentStatuses.length > 0) {
      whereClauses.push(
        Prisma.sql`LOWER(COALESCE(sessions.teacher_payment_status, '')) IN (${Prisma.join(normalizedPaymentStatuses)})`,
      );
    }

    const normalizedSessionIds = Array.from(
      new Set(
        (params.sessionIds ?? [])
          .map((sessionId) => sessionId.trim())
          .filter((sessionId) => sessionId.length > 0),
      ),
    );

    if (normalizedSessionIds.length > 0) {
      whereClauses.push(
        Prisma.sql`sessions.id IN (${Prisma.join(normalizedSessionIds)})`,
      );
    }

    return Prisma.sql`
      WITH session_attendance_allowances AS (
        SELECT
          sessions.id AS session_id,
          sessions.class_id,
          sessions.date AS session_date,
          sessions.teacher_payment_status,
          classes.name AS class_name,
          COALESCE(sessions.allowance_amount, 0) AS allowance_per_student,
          CASE
            WHEN LOWER(COALESCE(sessions.teacher_payment_status, '')) IN (${Prisma.join(
              NORMALIZED_DEPOSIT_PAYMENT_STATUSES,
            )}) THEN 0
            ELSE COALESCE(sessions.teacher_tax_deduction_rate_percent, 0)
          END AS teacher_tax_deduction_rate_percent,
          CASE
            WHEN LOWER(COALESCE(sessions.teacher_payment_status, '')) IN (${Prisma.join(
              NORMALIZED_DEPOSIT_PAYMENT_STATUSES,
            )}) THEN 0
            ELSE COALESCE(sessions.teacher_tax_rate_percent, 0)
          END AS teacher_operating_deduction_rate_percent,
          COALESCE(classes.scale_amount, 0) AS scale_amount,
          classes.max_allowance_per_session,
          COALESCE(sessions.coefficient, 1) AS coefficient,
          COUNT(*) FILTER (
            WHERE attendance.status IN ('present', 'excused')
          ) AS attended_student_count
        FROM attendance
        JOIN sessions ON attendance.session_id = sessions.id
        JOIN classes ON classes.id = sessions.class_id
        WHERE ${Prisma.join(whereClauses, ' AND ')}
        GROUP BY
          sessions.id,
          sessions.class_id,
          sessions.date,
          sessions.teacher_payment_status,
          classes.name,
          sessions.allowance_amount,
          sessions.teacher_tax_rate_percent,
          classes.scale_amount,
          classes.max_allowance_per_session,
          sessions.coefficient
      ),
      teacher_session_gross AS (
        SELECT
          session_id,
          class_id,
          session_date,
          teacher_payment_status,
          class_name,
          teacher_tax_deduction_rate_percent,
          teacher_operating_deduction_rate_percent,
          max_allowance_per_session,
          attended_student_count * 10 as attendance,
          LEAST(
            COALESCE(
              NULLIF(max_allowance_per_session, 0),
              ((allowance_per_student * attended_student_count) + scale_amount) *
                coefficient
            ),
            ((allowance_per_student * attended_student_count) + scale_amount) *
              coefficient
          ) AS teacher_gross_total
        FROM session_attendance_allowances
      ),
      teacher_session_allowances AS (
        SELECT
          session_id,
          class_id,
          session_date,
          teacher_payment_status,
          class_name,
          teacher_tax_deduction_rate_percent,
          teacher_gross_total,
          ROUND(
            (teacher_gross_total * teacher_operating_deduction_rate_percent) / 100.0,
            0
          ) AS teacher_operating_total,
          teacher_gross_total -
            ROUND(
              (teacher_gross_total * teacher_operating_deduction_rate_percent) / 100.0,
              0
            )
            AS teacher_after_operating_total
        FROM teacher_session_gross
      )
    `;
  }

  private async getTeacherAllowanceRowsByClassAndStatus(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
  }): Promise<TeacherAllowanceByClassStatusRow[]> {
    return this.prisma.$queryRaw<TeacherAllowanceByClassStatusRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte(params)}
      SELECT
        class_id AS "classId",
        class_name AS "className",
        teacher_payment_status AS "teacherPaymentStatus",
        COALESCE(SUM(teacher_gross_total), 0) AS "grossAllowance",
        COALESCE(SUM(teacher_operating_total), 0) AS "operatingAmount",
        COALESCE(SUM(teacher_after_operating_total), 0) AS "totalAllowance"
      FROM teacher_session_allowances
      GROUP BY class_id, class_name, teacher_payment_status
    `);
  }

  private async getTeacherAllowanceRowsByClass(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
  }): Promise<TeacherAllowanceByClassRow[]> {
    return this.prisma.$queryRaw<TeacherAllowanceByClassRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte(params)}
      SELECT
        class_id AS "classId",
        class_name AS "className",
        COALESCE(SUM(teacher_gross_total), 0) AS "grossAllowance",
        COALESCE(SUM(teacher_operating_total), 0) AS "operatingAmount",
        COALESCE(SUM(teacher_after_operating_total), 0) AS "totalAllowance"
      FROM teacher_session_allowances
      GROUP BY class_id, class_name
    `);
  }

  private async getTeacherAllowanceSourceRowsByStatusAndTaxBucket(params: {
    teacherId: string;
    start: Date;
    end: Date;
    teacherPaymentStatuses?: string[];
  }): Promise<SourcePaymentTaxBucketRow[]> {
    return this.prisma.$queryRaw<SourcePaymentTaxBucketRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte(params)}
      SELECT
        teacher_payment_status AS "paymentStatus",
        teacher_tax_deduction_rate_percent AS "taxRatePercent",
        COALESCE(SUM(teacher_gross_total), 0) AS "grossAmount",
        COALESCE(SUM(teacher_operating_total), 0) AS "operatingAmount",
        COALESCE(SUM(teacher_after_operating_total), 0) AS "taxableBaseAmount"
      FROM teacher_session_allowances
      GROUP BY teacher_payment_status, teacher_tax_deduction_rate_percent
    `);
  }

  private async getDepositSessionRows(params: {
    teacherId: string;
    start: Date;
    end: Date;
  }): Promise<DepositSessionRow[]> {
    return this.prisma.$queryRaw<DepositSessionRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte({
        teacherId: params.teacherId,
        start: params.start,
        end: params.end,
        teacherPaymentStatuses: [...DEPOSIT_PAYMENT_STATUSES],
      })}
      SELECT
        session_id AS id,
        class_id AS "classId",
        class_name AS "className",
        session_date AS date,
        teacher_payment_status AS "teacherPaymentStatus",
        COALESCE(teacher_after_operating_total, 0) AS "teacherAllowanceTotal"
      FROM teacher_session_allowances
      ORDER BY class_name ASC, session_date DESC, session_id ASC
    `);
  }

  private async getCustomerCareCommissionRowsByStatus(params: {
    staffId: string;
    start: Date;
    end: Date;
  }): Promise<SourcePaymentTaxBucketRow[]> {
    return this.prisma.$queryRaw<SourcePaymentTaxBucketRow[]>(Prisma.sql`
      SELECT
        COALESCE(attendance.customer_care_payment_status::text, ${PaymentStatus.pending}) AS "paymentStatus",
        COALESCE(attendance.customer_care_tax_deduction_rate_percent, 0) AS "taxRatePercent",
        COALESCE(
          SUM(
            ROUND(
              (COALESCE(attendance.tuition_fee, 0) * COALESCE(attendance.customer_care_coef, 0))::numeric,
              0
            )
          ),
          0
        ) AS "grossAmount",
        0 AS "operatingAmount"
      FROM attendance
      INNER JOIN sessions ON sessions.id = attendance.session_id
      WHERE attendance.customer_care_staff_id = ${params.staffId}
        AND sessions.date >= ${params.start}
        AND sessions.date < ${params.end}
      GROUP BY
        attendance.customer_care_payment_status,
        attendance.customer_care_tax_deduction_rate_percent
    `);
  }

  private async getAssistantTuitionShareRowsByStatus(params: {
    assistantStaffId: string;
    start: Date;
    end: Date;
  }): Promise<SourcePaymentTaxBucketRow[]> {
    return this.prisma.$queryRaw<SourcePaymentTaxBucketRow[]>(Prisma.sql`
      SELECT
        COALESCE(attendance.assistant_payment_status::text, ${PaymentStatus.pending}) AS "paymentStatus",
        COALESCE(attendance.assistant_tax_deduction_rate_percent, 0) AS "taxRatePercent",
        COALESCE(
          SUM(
            ROUND(
              (COALESCE(attendance.tuition_fee, 0) * 0.03)::numeric,
              0
            )
          ),
          0
        ) AS "grossAmount",
        0 AS "operatingAmount"
      FROM attendance
      INNER JOIN sessions ON sessions.id = attendance.session_id
      WHERE attendance.assistant_manager_staff_id = ${params.assistantStaffId}
        AND attendance.status IN ('present', 'excused')
        AND sessions.date >= ${params.start}
        AND sessions.date < ${params.end}
      GROUP BY
        attendance.assistant_payment_status,
        attendance.assistant_tax_deduction_rate_percent
    `);
  }

  private async getLessonOutputRowsByPaymentStatus(params: {
    staffId: string;
    start: Date;
    end: Date;
  }): Promise<SourcePaymentTaxBucketRow[]> {
    return this.prisma.$queryRaw<SourcePaymentTaxBucketRow[]>(Prisma.sql`
      SELECT
        payment_status::text AS "paymentStatus",
        COALESCE(tax_deduction_rate_percent, 0) AS "taxRatePercent",
        COALESCE(SUM(cost), 0) AS "grossAmount",
        0 AS "operatingAmount"
      FROM lesson_outputs
      WHERE staff_id = ${params.staffId}
        AND date >= ${params.start}
        AND date < ${params.end}
      GROUP BY payment_status, tax_deduction_rate_percent
    `);
  }

  private async getExtraAllowanceRowsByRoleAndStatus(params: {
    staffId: string;
    startMonthKey: string;
    endMonthKeyExclusive: string;
  }): Promise<ExtraAllowanceRoleTaxBucketRow[]> {
    const rows = await this.prisma.extraAllowance.findMany({
      where: {
        staffId: params.staffId,
        month: {
          gte: params.startMonthKey,
          lt: params.endMonthKeyExclusive,
        },
      },
      select: {
        roleType: true,
        status: true,
        amount: true,
        taxDeductionRatePercent: true,
      },
    });

    const groupedRows = new Map<string, ExtraAllowanceRoleTaxBucketRow>();

    rows.forEach((row) => {
      const taxRatePercent = normalizePercent(row.taxDeductionRatePercent);
      const key = `${row.roleType}:${row.status}:${taxRatePercent}`;
      const current = groupedRows.get(key) ?? {
        roleType: row.roleType,
        paymentStatus: row.status,
        taxRatePercent,
        grossAmount: 0,
        operatingAmount: 0,
      };

      current.grossAmount =
        normalizeMoneyAmount(current.grossAmount) +
        normalizeMoneyAmount(row.amount);
      groupedRows.set(key, current);
    });

    return Array.from(groupedRows.values());
  }

  private async getTeacherPaymentPreviewRows(
    db: StaffPaymentClient,
    params: {
      teacherId: string;
      start: Date;
      end: Date;
    },
  ): Promise<TeacherPaymentPreviewRow[]> {
    return db.$queryRaw<TeacherPaymentPreviewRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte({
        teacherId: params.teacherId,
        start: params.start,
        end: params.end,
        teacherPaymentStatuses: ['unpaid'],
      })}
      SELECT
        session_id AS id,
        class_id AS "classId",
        class_name AS "className",
        session_date AS date,
        teacher_payment_status AS "paymentStatus",
        COALESCE(teacher_gross_total, 0) AS "grossAmount",
        COALESCE(teacher_operating_total, 0) AS "operatingAmount",
        COALESCE(teacher_after_operating_total, 0) AS "taxableBaseAmount"
      FROM teacher_session_allowances
      ORDER BY session_date DESC, class_name ASC, session_id ASC
    `);
  }

  private async getTeacherDepositPaymentPreviewRows(
    db: StaffPaymentClient,
    params: {
      teacherId: string;
      start: Date;
      end: Date;
      sessionIds?: string[];
    },
  ): Promise<TeacherPaymentPreviewRow[]> {
    return db.$queryRaw<TeacherPaymentPreviewRow[]>(Prisma.sql`
      ${this.buildTeacherSessionAllowanceCte({
        teacherId: params.teacherId,
        start: params.start,
        end: params.end,
        teacherPaymentStatuses: [...DEPOSIT_PAYMENT_STATUSES],
        sessionIds: params.sessionIds,
      })}
      SELECT
        session_id AS id,
        class_id AS "classId",
        class_name AS "className",
        session_date AS date,
        teacher_payment_status AS "paymentStatus",
        COALESCE(teacher_gross_total, 0) AS "grossAmount",
        COALESCE(teacher_operating_total, 0) AS "operatingAmount",
        COALESCE(teacher_after_operating_total, 0) AS "taxableBaseAmount"
      FROM teacher_session_allowances
      ORDER BY session_date DESC, class_name ASC, session_id ASC
    `);
  }

  private async getTeacherPaymentPreviewRecords(
    db: StaffPaymentClient,
    params: {
      teacherId: string;
      start: Date;
      end: Date;
    },
  ): Promise<StaffPaymentPreviewDraftRecord[]> {
    const rows = await this.getTeacherPaymentPreviewRows(db, params);

    return rows.map((row) => {
      const grossAmount = normalizeMoneyAmount(row.grossAmount);
      const operatingAmount = normalizeMoneyAmount(row.operatingAmount);
      const taxableBaseAmount = normalizeMoneyAmount(row.taxableBaseAmount);

      return {
        id: row.id,
        role: StaffRole.teacher,
        sourceType: 'teacher_session',
        sourceLabel: 'Buổi dạy',
        label: row.className?.trim() || 'Lớp chưa đặt tên',
        secondaryLabel: row.classId?.trim() ? `Mã lớp: ${row.classId}` : null,
        date: toIsoDateString(row.date),
        currentStatus: row.paymentStatus,
        grossAmount,
        operatingAmount,
        taxableBaseAmount,
      };
    });
  }

  private async getCustomerCarePaymentPreviewRecords(
    db: StaffPaymentClient,
    params: {
      staffId: string;
      start: Date;
      end: Date;
    },
  ): Promise<StaffPaymentPreviewDraftRecord[]> {
    const rows = await db.attendance.findMany({
      where: {
        customerCareStaffId: params.staffId,
        session: {
          date: {
            gte: params.start,
            lt: params.end,
          },
        },
        OR: [
          { customerCarePaymentStatus: PaymentStatus.pending },
          { customerCarePaymentStatus: null },
        ],
      },
      select: {
        id: true,
        tuitionFee: true,
        customerCareCoef: true,
        customerCarePaymentStatus: true,
        student: {
          select: {
            fullName: true,
          },
        },
        session: {
          select: {
            date: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });

    return rows.map((row) => {
      const grossAmount = roundMoney(
        normalizeMoneyAmount(row.tuitionFee) *
          normalizePercent(row.customerCareCoef),
      );

      return {
        id: row.id,
        role: StaffRole.customer_care,
        sourceType: 'customer_care',
        sourceLabel: 'Hoa hồng CSKH',
        label: row.student.fullName?.trim() || 'Học sinh chưa đặt tên',
        secondaryLabel: row.session.class?.name?.trim() || 'Lớp chưa đặt tên',
        date: row.session.date.toISOString(),
        currentStatus: row.customerCarePaymentStatus ?? PaymentStatus.pending,
        grossAmount,
        operatingAmount: 0,
      };
    });
  }

  private async getAssistantSharePaymentPreviewRecords(
    db: StaffPaymentClient,
    params: {
      staffId: string;
      start: Date;
      end: Date;
    },
  ): Promise<StaffPaymentPreviewDraftRecord[]> {
    const rows = await db.attendance.findMany({
      where: {
        assistantManagerStaffId: params.staffId,
        status: {
          in: ['present', 'excused'],
        },
        session: {
          date: {
            gte: params.start,
            lt: params.end,
          },
        },
        OR: [
          { assistantPaymentStatus: PaymentStatus.pending },
          { assistantPaymentStatus: null },
        ],
      },
      select: {
        id: true,
        tuitionFee: true,
        assistantPaymentStatus: true,
        student: {
          select: {
            fullName: true,
          },
        },
        session: {
          select: {
            date: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });

    return rows.map((row) => {
      const grossAmount = roundMoney(
        normalizeMoneyAmount(row.tuitionFee) * 0.03,
      );

      return {
        id: row.id,
        role: StaffRole.assistant,
        sourceType: 'assistant_share',
        sourceLabel: 'Phần chia trợ lí 3%',
        label: row.student.fullName?.trim() || 'Học sinh chưa đặt tên',
        secondaryLabel: row.session.class?.name?.trim() || 'Lớp chưa đặt tên',
        date: row.session.date.toISOString(),
        currentStatus: row.assistantPaymentStatus ?? PaymentStatus.pending,
        grossAmount,
        operatingAmount: 0,
      };
    });
  }

  private async getLessonOutputPaymentPreviewRecords(
    db: StaffPaymentClient,
    params: {
      staffId: string;
      start: Date;
      end: Date;
      role: StaffRole;
    },
  ): Promise<StaffPaymentPreviewDraftRecord[]> {
    const rows = await db.lessonOutput.findMany({
      where: {
        staffId: params.staffId,
        date: {
          gte: params.start,
          lt: params.end,
        },
        paymentStatus: PaymentStatus.pending,
      },
      select: {
        id: true,
        lessonName: true,
        contestUploaded: true,
        date: true,
        paymentStatus: true,
        cost: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return rows.map((row) => {
      const grossAmount = normalizeMoneyAmount(row.cost);

      return {
        id: row.id,
        role: params.role,
        sourceType: 'lesson_output',
        sourceLabel: 'Lesson output',
        label: row.lessonName.trim() || 'Bài chưa đặt tên',
        secondaryLabel: row.contestUploaded?.trim() || null,
        date: row.date.toISOString(),
        currentStatus: row.paymentStatus,
        grossAmount,
        operatingAmount: 0,
      };
    });
  }

  private async getExtraAllowancePaymentPreviewRecords(
    db: StaffPaymentClient,
    params: {
      staffId: string;
      monthKey: string;
    },
  ): Promise<StaffPaymentPreviewDraftRecord[]> {
    const rows = await db.extraAllowance.findMany({
      where: {
        staffId: params.staffId,
        month: params.monthKey,
        status: PaymentStatus.pending,
      },
      select: {
        id: true,
        roleType: true,
        month: true,
        amount: true,
        status: true,
        note: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rows.map((row) => {
      const grossAmount = normalizeMoneyAmount(row.amount);
      const roleLabel = STAFF_ROLE_LABELS[row.roleType] ?? row.roleType;

      return {
        id: row.id,
        role: row.roleType,
        sourceType: 'extra_allowance',
        sourceLabel: 'Trợ cấp thêm',
        label: row.note?.trim() || `Trợ cấp ${roleLabel}`,
        secondaryLabel: row.month,
        date: null,
        currentStatus: row.status,
        grossAmount,
        operatingAmount: 0,
      };
    });
  }

  private async getBonusPaymentPreviewRecords(
    db: StaffPaymentClient,
    params: {
      staffId: string;
      monthKey: string;
    },
  ): Promise<StaffPaymentPreviewDraftRecord[]> {
    const rows = await db.bonus.findMany({
      where: {
        staffId: params.staffId,
        month: params.monthKey,
        status: PaymentStatus.pending,
      },
      select: {
        id: true,
        workType: true,
        month: true,
        amount: true,
        status: true,
        note: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rows.map((row) => {
      const grossAmount = normalizeMoneyAmount(row.amount);

      return {
        id: row.id,
        role: null,
        sourceType: 'bonus',
        sourceLabel: 'Thưởng',
        label: row.workType.trim() || 'Thưởng',
        secondaryLabel: row.note?.trim() || row.month,
        date: null,
        currentStatus: row.status,
        grossAmount,
        operatingAmount: 0,
      };
    });
  }

  private async resolveCurrentPaymentTaxRates(
    db: StaffPaymentClient,
    staffId: string,
    records: StaffPaymentPreviewDraftRecord[],
  ) {
    const effectiveDate = new Date();
    const uniqueRoles = Array.from(
      new Set(
        records
          .map((record) => record.role)
          .filter((role): role is StaffRole => role != null),
      ),
    );

    const taxRateEntries = await Promise.all(
      uniqueRoles.map(async (role) => {
        const ratePercent = await resolveTaxDeductionRate(db, {
          staffId,
          roleType: role,
          effectiveDate,
        });

        return [role, ratePercent] as const;
      }),
    );

    return {
      taxAsOfDate: effectiveDate.toISOString().slice(0, 10),
      taxRateByRole: new Map<StaffRole, number>(taxRateEntries),
    };
  }

  private finalizePaymentPreviewRecords(
    records: StaffPaymentPreviewDraftRecord[],
    taxRateByRole: Map<StaffRole, number>,
  ): StaffPaymentPreviewRecord[] {
    return records.map((record) => {
      const { taxableBaseAmount: _taxableBaseAmount, ...baseRecord } = record;
      const taxRatePercent =
        record.role == null ? 0 : (taxRateByRole.get(record.role) ?? 0);
      const taxableBaseAmount = normalizeMoneyAmount(
        record.taxableBaseAmount ?? record.grossAmount,
      );
      const taxAmount = calculateTaxAmount(taxableBaseAmount, taxRatePercent);

      return {
        ...baseRecord,
        taxRatePercent,
        taxAmount,
        netAmount: record.grossAmount - record.operatingAmount - taxAmount,
      };
    });
  }

  private async loadStaffPaymentPreviewRecords(
    db: StaffPaymentClient,
    id: string,
    query: {
      month: string;
      year: string;
    },
  ) {
    const range = buildMonthRange(query.month, query.year);
    const staff = await db.staffInfo.findUnique({
      where: { id },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const lessonRoleForOutputs = staff.roles.includes(
      StaffRole.lesson_plan_head,
    )
      ? StaffRole.lesson_plan_head
      : staff.roles.includes(StaffRole.lesson_plan)
        ? StaffRole.lesson_plan
        : StaffRole.lesson_plan;

    const [
      teacherRecords,
      customerCareRecords,
      assistantShareRecords,
      lessonOutputRecords,
      extraAllowanceRecords,
      bonusRecords,
    ] = await Promise.all([
      this.getTeacherPaymentPreviewRecords(db, {
        teacherId: id,
        start: range.start,
        end: range.end,
      }),
      this.getCustomerCarePaymentPreviewRecords(db, {
        staffId: id,
        start: range.start,
        end: range.end,
      }),
      this.getAssistantSharePaymentPreviewRecords(db, {
        staffId: id,
        start: range.start,
        end: range.end,
      }),
      this.getLessonOutputPaymentPreviewRecords(db, {
        staffId: id,
        start: range.start,
        end: range.end,
        role: lessonRoleForOutputs,
      }),
      this.getExtraAllowancePaymentPreviewRecords(db, {
        staffId: id,
        monthKey: range.monthKey,
      }),
      this.getBonusPaymentPreviewRecords(db, {
        staffId: id,
        monthKey: range.monthKey,
      }),
    ]);

    const draftRecords = [
      ...teacherRecords,
      ...customerCareRecords,
      ...assistantShareRecords,
      ...lessonOutputRecords,
      ...extraAllowanceRecords,
      ...bonusRecords,
    ];
    const { taxAsOfDate, taxRateByRole } =
      await this.resolveCurrentPaymentTaxRates(db, id, draftRecords);

    return {
      staff,
      monthKey: range.monthKey,
      taxAsOfDate,
      records: this.finalizePaymentPreviewRecords(draftRecords, taxRateByRole),
    };
  }

  private buildStaffPaymentPreviewResponse(params: {
    staffId: string;
    monthKey: string;
    taxAsOfDate: string;
    staffRoles: StaffRole[];
    records: StaffPaymentPreviewRecord[];
  }): StaffPaymentPreviewDto {
    const summary = makePaymentPreviewTotals();
    const sectionBuckets = new Map<string, StaffPaymentPreviewSectionBucket>();
    const roleOrder = new Map<string, number>();

    params.staffRoles
      .filter((role) => role !== StaffRole.admin)
      .forEach((role, index) => {
        roleOrder.set(role, index);
      });

    params.records.forEach((record) => {
      if (record.role && !roleOrder.has(record.role)) {
        roleOrder.set(record.role, roleOrder.size);
      }
    });

    params.records.forEach((record) => {
      const sectionKey = record.role ?? 'bonus';
      const sectionSortOrder =
        record.role == null
          ? 10_000
          : (roleOrder.get(record.role) ??
            9_000 + STAFF_PAYMENT_SOURCE_ORDER[record.sourceType]);
      const sectionLabel =
        record.role == null
          ? 'Thưởng'
          : (STAFF_ROLE_LABELS[record.role] ?? record.role);
      const sectionBucket = sectionBuckets.get(sectionKey) ?? {
        role: record.role,
        label: sectionLabel,
        ...makePaymentPreviewTotals(),
        sources: [],
        sortOrder: sectionSortOrder,
        sourceBuckets: new Map<string, StaffPaymentPreviewSourceBucket>(),
      };

      addPaymentPreviewRecordTotals(sectionBucket, record);
      addPaymentPreviewRecordTotals(summary, record);

      const sourceBucket = sectionBucket.sourceBuckets.get(
        record.sourceType,
      ) ?? {
        sourceType: record.sourceType,
        sourceLabel: record.sourceLabel,
        ...makePaymentPreviewTotals(),
        items: [],
        sortOrder: STAFF_PAYMENT_SOURCE_ORDER[record.sourceType],
      };

      addPaymentPreviewRecordTotals(sourceBucket, record);
      sourceBucket.items.push({
        id: record.id,
        label: record.label,
        secondaryLabel: record.secondaryLabel,
        date: record.date,
        currentStatus: record.currentStatus,
        taxRatePercent: record.taxRatePercent,
        grossAmount: record.grossAmount,
        operatingAmount: record.operatingAmount,
        taxAmount: record.taxAmount,
        netAmount: record.netAmount,
      });

      sectionBucket.sourceBuckets.set(record.sourceType, sourceBucket);
      sectionBuckets.set(sectionKey, sectionBucket);
    });

    const sections = Array.from(sectionBuckets.values())
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.label.localeCompare(right.label, 'vi');
      })
      .map((section) => {
        const sources = Array.from(section.sourceBuckets.values())
          .sort((left, right) => {
            if (left.sortOrder !== right.sortOrder) {
              return left.sortOrder - right.sortOrder;
            }

            return left.sourceLabel.localeCompare(right.sourceLabel, 'vi');
          })
          .map((source) => ({
            ...source,
            items: [...source.items].sort(comparePaymentPreviewItems),
          }));

        return {
          role: section.role,
          label: section.label,
          grossTotal: section.grossTotal,
          operatingTotal: section.operatingTotal,
          taxTotal: section.taxTotal,
          netTotal: section.netTotal,
          itemCount: section.itemCount,
          sources,
        };
      });

    return {
      staffId: params.staffId,
      month: params.monthKey,
      taxAsOfDate: params.taxAsOfDate,
      summary,
      sections,
    };
  }

  private async getSessionPaymentSnapshots(
    db: StaffPaymentClient,
    sessionIds: string[],
  ) {
    if (sessionIds.length === 0) {
      return new Map<string, unknown>();
    }

    const sessions = await db.session.findMany({
      where: {
        id: {
          in: sessionIds,
        },
      },
      select: {
        id: true,
        date: true,
        teacherPaymentStatus: true,
        teacherTaxDeductionRatePercent: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            user: {
              select: STAFF_NAME_USER_SELECT,
            },
          },
        },
      },
    });

    return new Map(
      sessions.map((session) => [
        session.id,
        {
          ...session,
          teacher: session.teacher
            ? {
                ...session.teacher,
                fullName: this.resolveStaffFullName(session.teacher.user),
              }
            : session.teacher,
        },
      ]),
    );
  }

  private async getBonusSnapshots(db: StaffPaymentClient, bonusIds: string[]) {
    if (bonusIds.length === 0) {
      return new Map<string, unknown>();
    }

    const bonuses = await db.bonus.findMany({
      where: {
        id: {
          in: bonusIds,
        },
      },
      include: {
        staff: true,
      },
    });

    return new Map(bonuses.map((bonus) => [bonus.id, bonus]));
  }

  private async getExtraAllowanceSnapshots(
    db: StaffPaymentClient,
    allowanceIds: string[],
  ) {
    if (allowanceIds.length === 0) {
      return new Map<string, unknown>();
    }

    const allowances = await db.extraAllowance.findMany({
      where: {
        id: {
          in: allowanceIds,
        },
      },
      include: {
        staff: {
          select: {
            id: true,
            roles: true,
            status: true,
            user: {
              select: STAFF_NAME_USER_SELECT,
            },
          },
        },
      },
    });

    return new Map(
      allowances.map((allowance) => [
        allowance.id,
        {
          ...allowance,
          staff: allowance.staff
            ? {
                ...allowance.staff,
                fullName: this.resolveStaffFullName(allowance.staff.user),
              }
            : allowance.staff,
        },
      ]),
    );
  }

  private async getLessonOutputSnapshots(
    db: StaffPaymentClient,
    outputIds: string[],
  ) {
    if (outputIds.length === 0) {
      return new Map<string, unknown>();
    }

    const outputs = await db.lessonOutput.findMany({
      where: {
        id: {
          in: outputIds,
        },
      },
      select: {
        id: true,
        lessonName: true,
        date: true,
        contestUploaded: true,
        cost: true,
        paymentStatus: true,
        taxDeductionRatePercent: true,
        staff: {
          select: {
            id: true,
            user: {
              select: STAFF_NAME_USER_SELECT,
            },
          },
        },
      },
    });

    return new Map(
      outputs.map((output) => [
        output.id,
        {
          ...output,
          staff: output.staff
            ? {
                ...output.staff,
                fullName: this.resolveStaffFullName(output.staff.user),
              }
            : output.staff,
        },
      ]),
    );
  }

  private async getAttendancePaymentSnapshots(
    db: StaffPaymentClient,
    attendanceIds: string[],
  ) {
    if (attendanceIds.length === 0) {
      return new Map<string, unknown>();
    }

    const attendances = await db.attendance.findMany({
      where: {
        id: {
          in: attendanceIds,
        },
      },
      select: {
        id: true,
        status: true,
        tuitionFee: true,
        customerCareCoef: true,
        customerCarePaymentStatus: true,
        customerCareTaxDeductionRatePercent: true,
        assistantPaymentStatus: true,
        assistantTaxDeductionRatePercent: true,
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
        session: {
          select: {
            id: true,
            date: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return new Map(
      attendances.map((attendance) => [attendance.id, attendance]),
    );
  }

  async getPaymentPreview(
    id: string,
    query: {
      month: string;
      year: string;
    },
  ): Promise<StaffPaymentPreviewDto> {
    const { staff, monthKey, taxAsOfDate, records } =
      await this.loadStaffPaymentPreviewRecords(this.prisma, id, query);

    return this.buildStaffPaymentPreviewResponse({
      staffId: id,
      monthKey,
      taxAsOfDate,
      staffRoles: staff.roles,
      records,
    });
  }

  private buildDepositPaymentPreviewResponse(params: {
    staffId: string;
    year: string;
    taxAsOfDate: string;
    records: StaffDepositPaymentPreviewSessionRecord[];
  }): StaffDepositPaymentPreviewDto {
    const summary = makeDepositPaymentPreviewTotals();
    const classBuckets = new Map<string, StaffDepositPaymentPreviewClassDto>();

    params.records.forEach((record) => {
      addDepositPaymentPreviewTotals(summary, record);

      const classBucket = classBuckets.get(record.classId) ?? {
        classId: record.classId,
        className: record.className,
        ...makeDepositPaymentPreviewTotals(),
        sessions: [],
      };

      addDepositPaymentPreviewTotals(classBucket, record);
      classBucket.sessions.push({
        id: record.id,
        date: record.date,
        currentStatus: record.currentStatus,
        preTaxAmount: record.preTaxAmount,
        taxRatePercent: record.taxRatePercent,
        taxAmount: record.taxAmount,
        netAmount: record.netAmount,
      } satisfies StaffDepositPaymentPreviewSessionDto);

      classBuckets.set(record.classId, classBucket);
    });

    const classes = Array.from(classBuckets.values())
      .sort((left, right) =>
        left.className.localeCompare(right.className, 'vi'),
      )
      .map((bucket) => ({
        ...bucket,
        sessions: [...bucket.sessions].sort((left, right) => {
          const leftTime = Date.parse(left.date);
          const rightTime = Date.parse(right.date);

          if (rightTime !== leftTime) {
            return rightTime - leftTime;
          }

          return left.id.localeCompare(right.id, 'vi');
        }),
      }));

    return {
      staffId: params.staffId,
      year: params.year,
      taxAsOfDate: params.taxAsOfDate,
      summary,
      classes,
    };
  }

  async getDepositPaymentPreview(
    id: string,
    query: {
      year: string;
    },
  ): Promise<StaffDepositPaymentPreviewDto> {
    const range = buildYearRange(query.year);
    const staff = await this.prisma.staffInfo.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const rows = await this.getTeacherDepositPaymentPreviewRows(this.prisma, {
      teacherId: id,
      start: range.start,
      end: range.end,
    });

    const effectiveDate = new Date();
    const taxRatePercent = 0;

    const records = rows.map((row) => {
      const preTaxAmount = normalizeMoneyAmount(row.taxableBaseAmount);
      const taxAmount = calculateTaxAmount(preTaxAmount, taxRatePercent);

      return {
        id: row.id,
        classId: row.classId?.trim() || row.id,
        className: row.className?.trim() || 'Lớp chưa đặt tên',
        date: toIsoDateString(row.date) ?? '',
        currentStatus: row.paymentStatus,
        preTaxAmount,
        taxRatePercent,
        taxAmount,
        netAmount: preTaxAmount,
      } satisfies StaffDepositPaymentPreviewSessionRecord;
    });

    return this.buildDepositPaymentPreviewResponse({
      staffId: id,
      year: range.yearKey,
      taxAsOfDate: effectiveDate.toISOString().slice(0, 10),
      records,
    });
  }

  async payDepositSessions(
    id: string,
    data: {
      sessionIds: string[];
    },
    auditActor?: ActionHistoryActor,
  ): Promise<StaffPayDepositSessionsResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const sessionIds = Array.from(
        new Set(
          (data.sessionIds ?? [])
            .map((sessionId) => sessionId.trim())
            .filter((sessionId) => sessionId.length > 0),
        ),
      );

      if (sessionIds.length === 0) {
        throw new BadRequestException('Vui lòng chọn ít nhất một buổi cọc.');
      }

      const staff = await tx.staffInfo.findUnique({
        where: { id },
        select: {
          id: true,
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff not found');
      }

      const matchingSessions = await tx.session.findMany({
        where: {
          id: {
            in: sessionIds,
          },
          teacherId: id,
        },
        select: {
          id: true,
          teacherPaymentStatus: true,
        },
      });

      if (matchingSessions.length !== sessionIds.length) {
        throw new BadRequestException(
          'Có buổi cọc không thuộc nhân sự này hoặc không còn tồn tại.',
        );
      }

      const invalidSession = matchingSessions.find(
        (session) => !isDepositPaymentStatus(session.teacherPaymentStatus),
      );

      if (invalidSession) {
        throw new BadRequestException(
          'Có buổi cọc đã đổi trạng thái. Vui lòng tải lại danh sách rồi thử lại.',
        );
      }

      const effectiveDate = new Date();
      const teacherTaxRatePercent = 0;

      const beforeSnapshots = await this.getSessionPaymentSnapshots(
        tx,
        sessionIds,
      );
      const updateResult = await tx.session.updateMany({
        where: {
          id: {
            in: sessionIds,
          },
        },
        data: {
          teacherTaxDeductionRatePercent: teacherTaxRatePercent,
          teacherOperatingDeductionRatePercent: 0,
          teacherPaymentStatus: 'paid',
        },
      });
      const updatedSessionIds = updateResult.count > 0 ? sessionIds : [];

      if (auditActor && updatedSessionIds.length > 0) {
        const afterSnapshots = await this.getSessionPaymentSnapshots(
          tx,
          updatedSessionIds,
        );

        for (const sessionId of updatedSessionIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'session',
            entityId: sessionId,
            description: 'Thanh toán cọc buổi dạy',
            beforeValue: beforeSnapshots.get(sessionId) ?? null,
            afterValue: afterSnapshots.get(sessionId) ?? null,
          });
        }
      }

      return {
        staffId: id,
        taxAsOfDate: effectiveDate.toISOString().slice(0, 10),
        teacherTaxRatePercent,
        requestedItemCount: sessionIds.length,
        updatedCount: updateResult.count,
        updatedSessionIds,
      };
    });
  }

  async payAllPayments(
    id: string,
    query: {
      month: string;
      year: string;
    },
    auditActor?: ActionHistoryActor,
  ): Promise<StaffPayAllPaymentsResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const { monthKey, records } = await this.loadStaffPaymentPreviewRecords(
        tx,
        id,
        query,
      );

      const teacherSessionIds = records
        .filter((record) => record.sourceType === 'teacher_session')
        .map((record) => record.id);
      const customerCareAttendanceIds = records
        .filter((record) => record.sourceType === 'customer_care')
        .map((record) => record.id);
      const assistantAttendanceIds = records
        .filter((record) => record.sourceType === 'assistant_share')
        .map((record) => record.id);
      const lessonOutputIds = records
        .filter((record) => record.sourceType === 'lesson_output')
        .map((record) => record.id);
      const extraAllowanceIds = records
        .filter((record) => record.sourceType === 'extra_allowance')
        .map((record) => record.id);
      const bonusIds = records
        .filter((record) => record.sourceType === 'bonus')
        .map((record) => record.id);
      const teacherTaxRatePercent =
        records.find((record) => record.sourceType === 'teacher_session')
          ?.taxRatePercent ?? 0;
      const customerCareTaxRatePercent =
        records.find((record) => record.sourceType === 'customer_care')
          ?.taxRatePercent ?? 0;
      const assistantTaxRatePercent =
        records.find((record) => record.sourceType === 'assistant_share')
          ?.taxRatePercent ?? 0;
      const lessonOutputTaxRatePercent =
        records.find((record) => record.sourceType === 'lesson_output')
          ?.taxRatePercent ?? 0;
      const extraAllowanceIdsByRole = records
        .filter(
          (record): record is StaffPaymentPreviewRecord & { role: StaffRole } =>
            record.sourceType === 'extra_allowance' && record.role != null,
        )
        .reduce<Map<StaffRole, { ids: string[]; taxRatePercent: number }>>(
          (grouped, record) => {
            const current = grouped.get(record.role) ?? {
              ids: [],
              taxRatePercent: record.taxRatePercent,
            };
            current.ids.push(record.id);
            grouped.set(record.role, current);
            return grouped;
          },
          new Map(),
        );

      if (records.length === 0) {
        return {
          staffId: id,
          month: monthKey,
          requestedItemCount: 0,
          updatedCount: 0,
          updatedBySource: [],
        };
      }

      const [
        sessionBeforeSnapshots,
        customerCareBeforeSnapshots,
        assistantBeforeSnapshots,
        lessonOutputBeforeSnapshots,
        extraAllowanceBeforeSnapshots,
        bonusBeforeSnapshots,
      ] = await Promise.all([
        this.getSessionPaymentSnapshots(tx, teacherSessionIds),
        this.getAttendancePaymentSnapshots(tx, customerCareAttendanceIds),
        this.getAttendancePaymentSnapshots(tx, assistantAttendanceIds),
        this.getLessonOutputSnapshots(tx, lessonOutputIds),
        this.getExtraAllowanceSnapshots(tx, extraAllowanceIds),
        this.getBonusSnapshots(tx, bonusIds),
      ]);

      const sourceResults: StaffPaymentSourceResult[] = [];

      if (teacherSessionIds.length > 0) {
        const updateResult = await tx.session.updateMany({
          where: {
            id: {
              in: teacherSessionIds,
            },
          },
          data: {
            teacherTaxDeductionRatePercent: teacherTaxRatePercent,
            teacherPaymentStatus: 'paid',
          },
        });
        sourceResults.push({
          sourceType: 'teacher_session',
          sourceLabel: 'Buổi dạy',
          updatedCount: updateResult.count,
        });
      }

      if (customerCareAttendanceIds.length > 0) {
        const updateResult = await tx.attendance.updateMany({
          where: {
            id: {
              in: customerCareAttendanceIds,
            },
          },
          data: {
            customerCareTaxDeductionRatePercent: customerCareTaxRatePercent,
            customerCarePaymentStatus: PaymentStatus.paid,
          },
        });
        sourceResults.push({
          sourceType: 'customer_care',
          sourceLabel: 'Hoa hồng CSKH',
          updatedCount: updateResult.count,
        });
      }

      if (assistantAttendanceIds.length > 0) {
        const updateResult = await tx.attendance.updateMany({
          where: {
            id: {
              in: assistantAttendanceIds,
            },
          },
          data: {
            assistantTaxDeductionRatePercent: assistantTaxRatePercent,
            assistantPaymentStatus: PaymentStatus.paid,
          },
        });
        sourceResults.push({
          sourceType: 'assistant_share',
          sourceLabel: 'Phần chia trợ lí 3%',
          updatedCount: updateResult.count,
        });
      }

      if (lessonOutputIds.length > 0) {
        const updateResult = await tx.lessonOutput.updateMany({
          where: {
            id: {
              in: lessonOutputIds,
            },
          },
          data: {
            taxDeductionRatePercent: lessonOutputTaxRatePercent,
            paymentStatus: PaymentStatus.paid,
          },
        });
        sourceResults.push({
          sourceType: 'lesson_output',
          sourceLabel: 'Lesson output',
          updatedCount: updateResult.count,
        });
      }

      if (extraAllowanceIds.length > 0) {
        let updatedCount = 0;

        for (const {
          ids,
          taxRatePercent,
        } of extraAllowanceIdsByRole.values()) {
          const updateResult = await tx.extraAllowance.updateMany({
            where: {
              id: {
                in: ids,
              },
            },
            data: {
              taxDeductionRatePercent: taxRatePercent,
              status: PaymentStatus.paid,
            },
          });
          updatedCount += updateResult.count;
        }

        sourceResults.push({
          sourceType: 'extra_allowance',
          sourceLabel: 'Trợ cấp thêm',
          updatedCount,
        });
      }

      if (bonusIds.length > 0) {
        const updateResult = await tx.bonus.updateMany({
          where: {
            id: {
              in: bonusIds,
            },
          },
          data: {
            status: PaymentStatus.paid,
          },
        });
        sourceResults.push({
          sourceType: 'bonus',
          sourceLabel: 'Thưởng',
          updatedCount: updateResult.count,
        });
      }

      if (auditActor) {
        const [
          sessionAfterSnapshots,
          customerCareAfterSnapshots,
          assistantAfterSnapshots,
          lessonOutputAfterSnapshots,
          extraAllowanceAfterSnapshots,
          bonusAfterSnapshots,
        ] = await Promise.all([
          this.getSessionPaymentSnapshots(tx, teacherSessionIds),
          this.getAttendancePaymentSnapshots(tx, customerCareAttendanceIds),
          this.getAttendancePaymentSnapshots(tx, assistantAttendanceIds),
          this.getLessonOutputSnapshots(tx, lessonOutputIds),
          this.getExtraAllowanceSnapshots(tx, extraAllowanceIds),
          this.getBonusSnapshots(tx, bonusIds),
        ]);

        for (const sessionId of teacherSessionIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'session',
            entityId: sessionId,
            description: 'Thanh toán toàn bộ khoản dạy học',
            beforeValue: sessionBeforeSnapshots.get(sessionId) ?? null,
            afterValue: sessionAfterSnapshots.get(sessionId) ?? null,
          });
        }

        for (const attendanceId of customerCareAttendanceIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'attendance',
            entityId: attendanceId,
            description: 'Thanh toán toàn bộ hoa hồng CSKH',
            beforeValue: customerCareBeforeSnapshots.get(attendanceId) ?? null,
            afterValue: customerCareAfterSnapshots.get(attendanceId) ?? null,
          });
        }

        for (const attendanceId of assistantAttendanceIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'attendance',
            entityId: attendanceId,
            description: 'Thanh toán toàn bộ phần chia trợ lí',
            beforeValue: assistantBeforeSnapshots.get(attendanceId) ?? null,
            afterValue: assistantAfterSnapshots.get(attendanceId) ?? null,
          });
        }

        for (const outputId of lessonOutputIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'lesson_output',
            entityId: outputId,
            description: 'Thanh toán toàn bộ lesson output',
            beforeValue: lessonOutputBeforeSnapshots.get(outputId) ?? null,
            afterValue: lessonOutputAfterSnapshots.get(outputId) ?? null,
          });
        }

        for (const allowanceId of extraAllowanceIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'extra_allowance',
            entityId: allowanceId,
            description: 'Thanh toán toàn bộ trợ cấp thêm',
            beforeValue: extraAllowanceBeforeSnapshots.get(allowanceId) ?? null,
            afterValue: extraAllowanceAfterSnapshots.get(allowanceId) ?? null,
          });
        }

        for (const bonusId of bonusIds) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'bonus',
            entityId: bonusId,
            description: 'Thanh toán toàn bộ khoản thưởng',
            beforeValue: bonusBeforeSnapshots.get(bonusId) ?? null,
            afterValue: bonusAfterSnapshots.get(bonusId) ?? null,
          });
        }
      }

      return {
        staffId: id,
        month: monthKey,
        requestedItemCount: records.length,
        updatedCount: sourceResults.reduce(
          (sum, sourceResult) => sum + sourceResult.updatedCount,
          0,
        ),
        updatedBySource: sourceResults.filter(
          (sourceResult) => sourceResult.updatedCount > 0,
        ),
      };
    });
  }

  private async getUnpaidTotalsByStaffIds(staffIds: string[]) {
    const normalizedStaffIds = Array.from(
      new Set(
        staffIds
          .map((staffId) => staffId.trim())
          .filter((staffId) => staffId.length > 0),
      ),
    );

    if (normalizedStaffIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.prisma.$queryRaw<StaffUnpaidTotalRow[]>(Prisma.sql`
      WITH target_staff AS (
        SELECT id
        FROM staff_info
        WHERE id IN (${Prisma.join(normalizedStaffIds)})
      ),
      teacher_session_rows AS (
        SELECT
          sessions.teacher_id AS staff_id,
          COALESCE(sessions.teacher_tax_deduction_rate_percent, 0) AS tax_rate_percent,
          LEAST(
            COALESCE(
              NULLIF(classes.max_allowance_per_session, 0),
              (
                (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
              COALESCE(classes.scale_amount, 0)
            ) * COALESCE(sessions.coefficient, 1)
          ) AS gross_amount,
          ROUND(
            (
              LEAST(
                COALESCE(
                  NULLIF(classes.max_allowance_per_session, 0),
                  (
                    (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
                    COALESCE(classes.scale_amount, 0)
                  ) * COALESCE(sessions.coefficient, 1)
                ),
                (
                  (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
                  COALESCE(classes.scale_amount, 0)
                ) * COALESCE(sessions.coefficient, 1)
              ) * COALESCE(sessions.teacher_tax_rate_percent, 0)
            ) / 100.0,
            0
          ) AS operating_amount,
          LEAST(
            COALESCE(
              NULLIF(classes.max_allowance_per_session, 0),
              (
                (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
                COALESCE(classes.scale_amount, 0)
              ) * COALESCE(sessions.coefficient, 1)
            ),
            (
              (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
              COALESCE(classes.scale_amount, 0)
            ) * COALESCE(sessions.coefficient, 1)
          ) -
          ROUND(
            (
              LEAST(
                COALESCE(
                  NULLIF(classes.max_allowance_per_session, 0),
                  (
                    (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
                    COALESCE(classes.scale_amount, 0)
                  ) * COALESCE(sessions.coefficient, 1)
                ),
                (
                  (COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused'))) +
                  COALESCE(classes.scale_amount, 0)
                ) * COALESCE(sessions.coefficient, 1)
              ) * COALESCE(sessions.teacher_tax_rate_percent, 0)
            ) / 100.0,
            0
          ) AS taxable_base_amount
        FROM attendance
        INNER JOIN sessions ON attendance.session_id = sessions.id
        INNER JOIN classes ON classes.id = sessions.class_id
        INNER JOIN target_staff ON target_staff.id = sessions.teacher_id
        WHERE LOWER(COALESCE(sessions.teacher_payment_status, '')) = 'unpaid'
        GROUP BY
          sessions.teacher_id,
          sessions.id,
          sessions.allowance_amount,
          sessions.teacher_tax_deduction_rate_percent,
          sessions.teacher_tax_rate_percent,
          classes.scale_amount,
          classes.max_allowance_per_session,
          sessions.coefficient
      ),
      session_unpaid_buckets AS (
        SELECT
          staff_id,
          tax_rate_percent,
          COALESCE(SUM(gross_amount), 0) AS gross_amount,
          COALESCE(SUM(operating_amount), 0) AS operating_amount,
          COALESCE(SUM(taxable_base_amount), 0) AS taxable_base_amount
        FROM teacher_session_rows
        GROUP BY staff_id, tax_rate_percent
      ),
      session_unpaid AS (
        SELECT
          staff_id,
          COALESCE(
            SUM(
              gross_amount -
              operating_amount -
              ROUND((taxable_base_amount * tax_rate_percent) / 100.0, 0)
            ),
            0
          ) AS amount
        FROM session_unpaid_buckets
        GROUP BY staff_id
      ),
      bonus_unpaid AS (
        SELECT
          bonuses.staff_id AS staff_id,
          COALESCE(SUM(bonuses.amount), 0) AS amount
        FROM bonuses
        INNER JOIN target_staff ON target_staff.id = bonuses.staff_id
        WHERE bonuses.status::text = 'pending'
        GROUP BY bonuses.staff_id
      ),
      customer_care_unpaid_rows AS (
        SELECT
          attendance.customer_care_staff_id AS staff_id,
          COALESCE(attendance.customer_care_tax_deduction_rate_percent, 0) AS tax_rate_percent,
          ROUND(
            (COALESCE(attendance.tuition_fee, 0) * COALESCE(attendance.customer_care_coef, 0))::numeric,
            0
          ) AS gross_amount
        FROM attendance
        INNER JOIN target_staff ON target_staff.id = attendance.customer_care_staff_id
        WHERE COALESCE(attendance.customer_care_payment_status::text, 'pending') = 'pending'
      ),
      customer_care_unpaid_buckets AS (
        SELECT
          staff_id,
          tax_rate_percent,
          COALESCE(SUM(gross_amount), 0) AS gross_amount
        FROM customer_care_unpaid_rows
        GROUP BY staff_id, tax_rate_percent
      ),
      customer_care_unpaid AS (
        SELECT
          staff_id,
          COALESCE(
            SUM(
              gross_amount -
              ROUND((gross_amount * tax_rate_percent) / 100.0, 0)
            ),
            0
          ) AS amount
        FROM customer_care_unpaid_buckets
        GROUP BY staff_id
      ),
      lesson_output_unpaid_rows AS (
        SELECT
          lesson_outputs.staff_id AS staff_id,
          COALESCE(lesson_outputs.tax_deduction_rate_percent, 0) AS tax_rate_percent,
          COALESCE(lesson_outputs.cost, 0) AS gross_amount
        FROM lesson_outputs
        INNER JOIN target_staff ON target_staff.id = lesson_outputs.staff_id
        WHERE lesson_outputs.payment_status::text = 'pending'
      ),
      lesson_output_unpaid_buckets AS (
        SELECT
          staff_id,
          tax_rate_percent,
          COALESCE(SUM(gross_amount), 0) AS gross_amount
        FROM lesson_output_unpaid_rows
        GROUP BY staff_id, tax_rate_percent
      ),
      lesson_output_unpaid AS (
        SELECT
          staff_id,
          COALESCE(
            SUM(
              gross_amount -
              ROUND((gross_amount * tax_rate_percent) / 100.0, 0)
            ),
            0
          ) AS amount
        FROM lesson_output_unpaid_buckets
        GROUP BY staff_id
      ),
      assistant_unpaid_rows AS (
        SELECT
          attendance.assistant_manager_staff_id AS staff_id,
          COALESCE(attendance.assistant_tax_deduction_rate_percent, 0) AS tax_rate_percent,
          ROUND((COALESCE(attendance.tuition_fee, 0) * 0.03)::numeric, 0) AS gross_amount
        FROM attendance
        INNER JOIN target_staff ON target_staff.id = attendance.assistant_manager_staff_id
        WHERE attendance.status IN ('present', 'excused')
          AND COALESCE(attendance.assistant_payment_status::text, 'pending') = 'pending'
      ),
      assistant_unpaid_buckets AS (
        SELECT
          staff_id,
          tax_rate_percent,
          COALESCE(SUM(gross_amount), 0) AS gross_amount
        FROM assistant_unpaid_rows
        GROUP BY staff_id, tax_rate_percent
      ),
      assistant_unpaid AS (
        SELECT
          staff_id,
          COALESCE(
            SUM(
              gross_amount -
              ROUND((gross_amount * tax_rate_percent) / 100.0, 0)
            ),
            0
          ) AS amount
        FROM assistant_unpaid_buckets
        GROUP BY staff_id
      ),
      extra_allowance_unpaid_rows AS (
        SELECT
          extra_allowances.staff_id AS staff_id,
          COALESCE(extra_allowances.tax_deduction_rate_percent, 0) AS tax_rate_percent,
          COALESCE(extra_allowances.amount, 0) AS gross_amount
        FROM extra_allowances
        INNER JOIN target_staff ON target_staff.id = extra_allowances.staff_id
        WHERE extra_allowances.status::text = 'pending'
      ),
      extra_allowance_unpaid_buckets AS (
        SELECT
          staff_id,
          tax_rate_percent,
          COALESCE(SUM(gross_amount), 0) AS gross_amount
        FROM extra_allowance_unpaid_rows
        GROUP BY staff_id, tax_rate_percent
      ),
      extra_allowance_unpaid AS (
        SELECT
          staff_id,
          COALESCE(
            SUM(
              gross_amount -
              ROUND((gross_amount * tax_rate_percent) / 100.0, 0)
            ),
            0
          ) AS amount
        FROM extra_allowance_unpaid_buckets
        GROUP BY staff_id
      ),
      all_unpaid AS (
        SELECT staff_id, amount FROM session_unpaid
        UNION ALL
        SELECT staff_id, amount FROM bonus_unpaid
        UNION ALL
        SELECT staff_id, amount FROM customer_care_unpaid
        UNION ALL
        SELECT staff_id, amount FROM lesson_output_unpaid
        UNION ALL
        SELECT staff_id, amount FROM assistant_unpaid
        UNION ALL
        SELECT staff_id, amount FROM extra_allowance_unpaid
      )
      SELECT
        target_staff.id AS "staffId",
        COALESCE(SUM(all_unpaid.amount), 0) AS "totalUnpaid"
      FROM target_staff
      LEFT JOIN all_unpaid ON all_unpaid.staff_id = target_staff.id
      GROUP BY target_staff.id
    `);

    return new Map(
      rows.map((row) => [row.staffId, normalizeMoneyAmount(row.totalUnpaid)]),
    );
  }

  async getIncomeSummary(
    id: string,
    query: {
      month: string;
      year: string;
      days?: number;
    },
  ): Promise<StaffIncomeSummaryDto> {
    const range = buildMonthRange(query.month, query.year);
    const recentWindow = buildRecentWindow(query.days);
    const nextMonthKey = formatMonthKey(range.end);
    const yearStartMonthKey = `${query.year}-01`;
    const yearEndMonthKeyExclusive = `${range.yearEnd.getFullYear()}-01`;

    const staff = await this.prisma.staffInfo.findUnique({
      where: { id },
      select: {
        id: true,
        roles: true,
        classTeachers: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const isAssistant = staff.roles.includes(StaffRole.assistant);

    const [
      monthlySessionSummaryRows,
      sessionYearSummaryRows,
      monthlySessionRows,
      depositSessionRows,
      recentUnpaidSessionRows,
      monthlyBonuses,
      yearBonuses,
      monthlyExtraAllowanceRows,
      yearExtraAllowanceRows,
      customerCareMonthlyRows,
      customerCareYearRows,
      lessonOutputMonthlyRows,
      lessonOutputYearRows,
      assistantShareMonthlyRows,
      assistantShareYearRows,
    ] = await Promise.all([
      this.getTeacherAllowanceSourceRowsByStatusAndTaxBucket({
        teacherId: id,
        start: range.start,
        end: range.end,
      }),
      this.getTeacherAllowanceSourceRowsByStatusAndTaxBucket({
        teacherId: id,
        start: range.yearStart,
        end: range.yearEnd,
      }),
      this.getTeacherAllowanceRowsByClassAndStatus({
        teacherId: id,
        start: range.start,
        end: range.end,
      }),
      this.getDepositSessionRows({
        teacherId: id,
        start: range.yearStart,
        end: range.yearEnd,
      }),
      this.getTeacherAllowanceRowsByClass({
        teacherId: id,
        start: recentWindow.start,
        end: recentWindow.end,
        teacherPaymentStatuses: ['unpaid'],
      }),
      this.prisma.bonus.findMany({
        where: {
          staffId: id,
          month: range.monthKey,
        },
        select: {
          workType: true,
          amount: true,
          status: true,
        },
      }),
      this.prisma.bonus.findMany({
        where: {
          staffId: id,
          month: {
            startsWith: `${query.year}-`,
          },
        },
        select: {
          amount: true,
        },
      }),
      this.getExtraAllowanceRowsByRoleAndStatus({
        staffId: id,
        startMonthKey: range.monthKey,
        endMonthKeyExclusive: nextMonthKey,
      }),
      this.getExtraAllowanceRowsByRoleAndStatus({
        staffId: id,
        startMonthKey: yearStartMonthKey,
        endMonthKeyExclusive: yearEndMonthKeyExclusive,
      }),
      staff.roles.includes(StaffRole.customer_care)
        ? this.getCustomerCareCommissionRowsByStatus({
            staffId: id,
            start: range.start,
            end: range.end,
          })
        : Promise.resolve<SourcePaymentTaxBucketRow[]>([]),
      staff.roles.includes(StaffRole.customer_care)
        ? this.getCustomerCareCommissionRowsByStatus({
            staffId: id,
            start: range.yearStart,
            end: range.yearEnd,
          })
        : Promise.resolve<SourcePaymentTaxBucketRow[]>([]),
      staff.roles.some(
        (role) =>
          role === StaffRole.lesson_plan || role === StaffRole.lesson_plan_head,
      )
        ? this.getLessonOutputRowsByPaymentStatus({
            staffId: id,
            start: range.start,
            end: range.end,
          })
        : Promise.resolve<SourcePaymentTaxBucketRow[]>([]),
      staff.roles.some(
        (role) =>
          role === StaffRole.lesson_plan || role === StaffRole.lesson_plan_head,
      )
        ? this.getLessonOutputRowsByPaymentStatus({
            staffId: id,
            start: range.yearStart,
            end: range.yearEnd,
          })
        : Promise.resolve<SourcePaymentTaxBucketRow[]>([]),
      isAssistant
        ? this.getAssistantTuitionShareRowsByStatus({
            assistantStaffId: id,
            start: range.start,
            end: range.end,
          })
        : Promise.resolve<SourcePaymentTaxBucketRow[]>([]),
      isAssistant
        ? this.getAssistantTuitionShareRowsByStatus({
            assistantStaffId: id,
            start: range.yearStart,
            end: range.yearEnd,
          })
        : Promise.resolve<SourcePaymentTaxBucketRow[]>([]),
    ]);

    const sessionMonthlySummary = summarizeSourceBucketRows(
      monthlySessionSummaryRows,
    );
    const sessionYearSummary = summarizeSourceBucketRows(
      sessionYearSummaryRows,
    );
    const extraAllowanceMonthlySummary = summarizeSourceBucketRows(
      monthlyExtraAllowanceRows,
    );
    const extraAllowanceYearSummary = summarizeSourceBucketRows(
      yearExtraAllowanceRows,
    );
    const customerCareMonthlySummary = summarizeSourceBucketRows(
      customerCareMonthlyRows,
    );
    const customerCareYearSummary =
      summarizeSourceBucketRows(customerCareYearRows);
    const lessonOutputMonthlySummary = summarizeSourceBucketRows(
      lessonOutputMonthlyRows,
    );
    const lessonOutputYearSummary =
      summarizeSourceBucketRows(lessonOutputYearRows);
    const assistantShareMonthlySummary = summarizeSourceBucketRows(
      assistantShareMonthlyRows,
    );
    const assistantShareYearSummary = summarizeSourceBucketRows(
      assistantShareYearRows,
    );

    const sessionMonthlyTotals = sessionMonthlySummary.netTotals;
    const sessionMonthlyGrossTotals = sessionMonthlySummary.grossTotals;
    const sessionMonthlyTaxTotals = sessionMonthlySummary.taxTotals;
    const sessionMonthlyOperatingDeductionTotals =
      sessionMonthlySummary.operatingTotals;
    const sessionMonthlyTotalDeductionTotals =
      sessionMonthlySummary.totalDeductionTotals;

    const classSummaryById = new Map<string, StaffIncomeClassSummaryDto>();
    staff.classTeachers.forEach((assignment) => {
      classSummaryById.set(assignment.class.id, {
        classId: assignment.class.id,
        className: assignment.class.name,
        ...makeAmountSummary(),
      });
    });

    monthlySessionRows.forEach((row) => {
      const classId = row.classId?.trim();
      if (!classId) return;

      const current = classSummaryById.get(classId) ?? {
        classId,
        className: row.className?.trim() || 'Lớp chưa đặt tên',
        ...makeAmountSummary(),
      };
      const amount = normalizeMoneyAmount(row.totalAllowance);
      const isPaid =
        String(row.teacherPaymentStatus ?? '').toLowerCase() === 'paid';

      classSummaryById.set(classId, {
        ...current,
        total: current.total + amount,
        paid: current.paid + (isPaid ? amount : 0),
      });
    });

    recentUnpaidSessionRows.forEach((row) => {
      const classId = row.classId?.trim();
      if (!classId) return;

      const current = classSummaryById.get(classId) ?? {
        classId,
        className: row.className?.trim() || 'Lớp chưa đặt tên',
        ...makeAmountSummary(),
      };

      classSummaryById.set(classId, {
        ...current,
        unpaid: current.unpaid + normalizeMoneyAmount(row.totalAllowance),
      });
    });

    const bonusMonthlyTotals =
      monthlyBonuses.reduce<StaffIncomeAmountSummaryDto>((summary, bonus) => {
        const amount = normalizeMoneyAmount(bonus.amount);
        const isPaid = String(bonus.status ?? '').toLowerCase() === 'paid';

        return {
          total: summary.total + amount,
          paid: summary.paid + (isPaid ? amount : 0),
          unpaid: summary.unpaid + (isPaid ? 0 : amount),
        };
      }, makeAmountSummary());

    const extraAllowanceMonthlyTotals = extraAllowanceMonthlySummary.netTotals;
    const extraAllowanceMonthlyGrossTotals =
      extraAllowanceMonthlySummary.grossTotals;
    const extraAllowanceMonthlyTaxTotals =
      extraAllowanceMonthlySummary.taxTotals;

    const customerCareMonthlyTotals = customerCareMonthlySummary.netTotals;
    const customerCareMonthlyGrossTotals =
      customerCareMonthlySummary.grossTotals;
    const customerCareMonthlyTaxTotals = customerCareMonthlySummary.taxTotals;

    const lessonOutputMonthlyTotals = lessonOutputMonthlySummary.netTotals;
    const lessonOutputMonthlyGrossTotals =
      lessonOutputMonthlySummary.grossTotals;
    const lessonOutputMonthlyTaxTotals = lessonOutputMonthlySummary.taxTotals;

    const assistantShareMonthlyTotals = assistantShareMonthlySummary.netTotals;
    const assistantShareMonthlyGrossTotals =
      assistantShareMonthlySummary.grossTotals;
    const assistantShareMonthlyTaxTotals =
      assistantShareMonthlySummary.taxTotals;

    const monthlyIncomeTotals = [
      sessionMonthlyTotals,
      bonusMonthlyTotals,
      extraAllowanceMonthlyTotals,
      customerCareMonthlyTotals,
      lessonOutputMonthlyTotals,
      assistantShareMonthlyTotals,
    ].reduce(mergeAmountSummary, makeAmountSummary());

    const monthlyGrossTotals = [
      sessionMonthlyGrossTotals,
      bonusMonthlyTotals,
      extraAllowanceMonthlyGrossTotals,
      customerCareMonthlyGrossTotals,
      lessonOutputMonthlyGrossTotals,
      assistantShareMonthlyGrossTotals,
    ].reduce(mergeAmountSummary, makeAmountSummary());

    const monthlyTaxTotals = [
      sessionMonthlyTaxTotals,
      extraAllowanceMonthlyTaxTotals,
      customerCareMonthlyTaxTotals,
      lessonOutputMonthlyTaxTotals,
      assistantShareMonthlyTaxTotals,
    ].reduce(mergeAmountSummary, makeAmountSummary());

    const monthlyOperatingDeductionTotals = [
      sessionMonthlyOperatingDeductionTotals,
    ].reduce(mergeAmountSummary, makeAmountSummary());

    const monthlyTotalDeductionTotals = [
      monthlyTaxTotals,
      monthlyOperatingDeductionTotals,
    ].reduce(mergeAmountSummary, makeAmountSummary());

    const bonusYearTotal = yearBonuses.reduce(
      (sum, bonus) => sum + normalizeMoneyAmount(bonus.amount),
      0,
    );
    const extraAllowanceYearTotal = extraAllowanceYearSummary.netTotals.total;
    const extraAllowanceYearGrossTotal =
      extraAllowanceYearSummary.grossTotals.total;
    const extraAllowanceYearTaxTotal =
      extraAllowanceYearSummary.taxTotals.total;
    const customerCareYearTotal = customerCareYearSummary.netTotals.total;
    const customerCareYearGrossTotal =
      customerCareYearSummary.grossTotals.total;
    const customerCareYearTaxTotal = customerCareYearSummary.taxTotals.total;
    const lessonOutputYearTotal = lessonOutputYearSummary.netTotals.total;
    const lessonOutputYearGrossTotal =
      lessonOutputYearSummary.grossTotals.total;
    const lessonOutputYearTaxTotal = lessonOutputYearSummary.taxTotals.total;
    const assistantShareYearTotal = assistantShareYearSummary.netTotals.total;
    const assistantShareYearGrossTotal =
      assistantShareYearSummary.grossTotals.total;
    const assistantShareYearTaxTotal =
      assistantShareYearSummary.taxTotals.total;
    const sessionYearTotal = sessionYearSummary.netTotals.total;
    const sessionYearGrossTotal = sessionYearSummary.grossTotals.total;
    const sessionYearTaxTotal = sessionYearSummary.taxTotals.total;
    const yearOperatingDeductionTotal =
      sessionYearSummary.operatingTotals.total;
    const yearIncomeTotal =
      sessionYearTotal +
      bonusYearTotal +
      extraAllowanceYearTotal +
      customerCareYearTotal +
      lessonOutputYearTotal +
      assistantShareYearTotal;
    const yearGrossIncomeTotal =
      sessionYearGrossTotal +
      bonusYearTotal +
      extraAllowanceYearGrossTotal +
      customerCareYearGrossTotal +
      lessonOutputYearGrossTotal +
      assistantShareYearGrossTotal;
    const yearTaxTotal =
      sessionYearTaxTotal +
      extraAllowanceYearTaxTotal +
      customerCareYearTaxTotal +
      lessonOutputYearTaxTotal +
      assistantShareYearTaxTotal;
    const yearTotalDeductionTotal = yearTaxTotal + yearOperatingDeductionTotal;

    const lessonRoleForOutputs = staff.roles.includes(
      StaffRole.lesson_plan_head,
    )
      ? StaffRole.lesson_plan_head
      : staff.roles.includes(StaffRole.lesson_plan)
        ? StaffRole.lesson_plan
        : null;

    const otherRoleSummaryMap = new Map<string, StaffIncomeRoleSummaryDto>();
    staff.roles
      .filter((role) => role !== StaffRole.teacher)
      .forEach((role) => {
        otherRoleSummaryMap.set(role, {
          role,
          label: STAFF_ROLE_LABELS[role] ?? role,
          ...makeAmountSummary(),
        });
      });

    monthlyExtraAllowanceRows.forEach((row) => {
      if (!EXTRA_ALLOWANCE_BACKED_OTHER_ROLES.has(row.roleType)) {
        return;
      }

      const summary = otherRoleSummaryMap.get(row.roleType);
      if (!summary) {
        return;
      }

      addAmountToSummary(
        summary,
        row.paymentStatus,
        calculateBucketNetAmount(row),
      );
    });

    const customerCareSummary = otherRoleSummaryMap.get(
      StaffRole.customer_care,
    );
    if (customerCareSummary) {
      customerCareSummary.total += customerCareMonthlyTotals.total;
      customerCareSummary.paid += customerCareMonthlyTotals.paid;
      customerCareSummary.unpaid += customerCareMonthlyTotals.unpaid;
    }

    if (lessonRoleForOutputs) {
      const lessonSummary = otherRoleSummaryMap.get(lessonRoleForOutputs);
      if (lessonSummary) {
        lessonSummary.total += lessonOutputMonthlyTotals.total;
        lessonSummary.paid += lessonOutputMonthlyTotals.paid;
        lessonSummary.unpaid += lessonOutputMonthlyTotals.unpaid;
      }
    }

    if (isAssistant) {
      const assistantSummary = otherRoleSummaryMap.get(StaffRole.assistant);
      if (assistantSummary) {
        assistantSummary.total += assistantShareMonthlyTotals.total;
        assistantSummary.paid += assistantShareMonthlyTotals.paid;
        assistantSummary.unpaid += assistantShareMonthlyTotals.unpaid;
      }
    }

    const otherRoleSummaries: StaffIncomeRoleSummaryDto[] = staff.roles
      .filter((role) => role !== StaffRole.teacher)
      .map((role) => {
        return (
          otherRoleSummaryMap.get(role) ?? {
            role,
            label: STAFF_ROLE_LABELS[role] ?? role,
            ...makeAmountSummary(),
          }
        );
      });

    const depositByClass = new Map<string, StaffIncomeDepositClassSummaryDto>();
    depositSessionRows.forEach((row) => {
      const classId = row.classId?.trim();
      if (!classId) return;

      const amount = normalizeMoneyAmount(row.teacherAllowanceTotal);
      const current = depositByClass.get(classId) ?? {
        classId,
        className: row.className?.trim() || 'Lớp chưa đặt tên',
        total: 0,
        sessions: [],
      };

      current.total += amount;
      current.sessions.push({
        id: row.id,
        date:
          row.date instanceof Date ? row.date.toISOString() : String(row.date),
        teacherPaymentStatus: row.teacherPaymentStatus,
        teacherAllowanceTotal: amount,
      });

      depositByClass.set(classId, current);
    });

    const depositYearByClass = Array.from(depositByClass.values()).sort(
      (a, b) => a.className.localeCompare(b.className, 'vi'),
    );
    const depositYearTotal = depositYearByClass.reduce(
      (sum, item) => sum + item.total,
      0,
    );

    return {
      recentUnpaidDays: recentWindow.days,
      monthlyIncomeTotals,
      monthlyGrossTotals,
      monthlyTaxTotals,
      monthlyOperatingDeductionTotals,
      monthlyTotalDeductionTotals,
      sessionMonthlyTotals,
      sessionMonthlyGrossTotals,
      sessionMonthlyTaxTotals,
      sessionMonthlyOperatingDeductionTotals,
      sessionMonthlyTotalDeductionTotals,
      sessionYearTotal,
      yearIncomeTotal,
      yearGrossIncomeTotal,
      yearTaxTotal,
      yearOperatingDeductionTotal,
      yearTotalDeductionTotal,
      depositYearTotal,
      depositYearByClass,
      classMonthlySummaries: Array.from(classSummaryById.values()).sort(
        (a, b) => a.className.localeCompare(b.className, 'vi'),
      ),
      bonusMonthlyTotals,
      otherRoleSummaries,
    };
  }

  async getStaffById(id: string) {
    const tx = await this.prisma.$transaction(async (tx) => {
      const staff = await tx.staffInfo.findUnique({
        where: {
          id,
        },
        include: {
          user: {
            select: {
              ...STAFF_NAME_USER_SELECT,
              province: true,
            },
          },
          classTeachers: {
            include: { class: { select: { id: true, name: true } } },
          },
          monthlyStats: {
            orderBy: { month: 'desc' },
            take: 1,
            select: { totalUnpaidAll: true },
          },
          customerCareManagedBy: {
            select: {
              id: true,
              user: {
                select: STAFF_NAME_USER_SELECT,
              },
            },
          },
        },
      });

      if (!staff) {
        throw new NotFoundException('Staff not found');
      }

      const classAllowance = await tx.$queryRaw`
      SELECT class_id, teacher_payment_status, SUM(teacher_after_operating_total) as total_allowance, classes.name
      from
        (SELECT
          attendance.session_id,
          sessions.class_id,
          COALESCE(sessions.allowance_amount, 0) AS allowance_amount,
          COALESCE(classes.scale_amount, 0) AS scale_amount,
          sessions.teacher_payment_status,
          LEAST(
            COALESCE(
              NULLIF(classes.max_allowance_per_session, 0),
              (
                COALESCE(sessions.coefficient, 1) * (
                  COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused')) + COALESCE(classes.scale_amount, 0)
                )
              )
            ),
            (
              COALESCE(sessions.coefficient, 1) * (
                COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused')) + COALESCE(classes.scale_amount, 0)
              )
            )
          ) -
          CASE
            WHEN LOWER(COALESCE(sessions.teacher_payment_status, '')) IN (${Prisma.join(
              NORMALIZED_DEPOSIT_PAYMENT_STATUSES,
            )}) THEN 0
            ELSE ROUND(
              (
                LEAST(
                  COALESCE(
                    NULLIF(classes.max_allowance_per_session, 0),
                    (
                      COALESCE(sessions.coefficient, 1) * (
                        COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused')) + COALESCE(classes.scale_amount, 0)
                      )
                    )
                  ),
                  (
                    COALESCE(sessions.coefficient, 1) * (
                      COALESCE(sessions.allowance_amount, 0) * COUNT(*) FILTER (WHERE attendance.status IN ('present', 'excused')) + COALESCE(classes.scale_amount, 0)
                    )
                  )
                ) * COALESCE(sessions.teacher_tax_rate_percent, 0)
              ) / 100.0,
              0
            )
          END AS teacher_after_operating_total
        from attendance
        join sessions on attendance.session_id = sessions.id
        join classes on classes.id = sessions.class_id
        where sessions.teacher_id=${id}
        group by sessions.class_id, attendance.session_id, sessions.allowance_amount, classes.scale_amount, sessions.teacher_payment_status, classes.max_allowance_per_session, sessions.coefficient, sessions.teacher_tax_rate_percent) as tab
      join classes on classes.id = class_id
      group by tab.class_id, teacher_payment_status , classes.name
      `;

      return {
        ...this.attachDerivedStaffFullName(staff),
        customerCareManagedBy: staff.customerCareManagedBy
          ? {
              id: staff.customerCareManagedBy.id,
              fullName: this.resolveStaffFullName(
                staff.customerCareManagedBy.user,
              ),
            }
          : null,
        classAllowance,
      };
    });

    return this.attachCccdImageUrls(tx);
  }

  async updateStaff(data: UpdateStaffDto, auditActor?: ActionHistoryActor) {
    const existingStaff = await this.getStaffAuditSnapshot(
      this.prisma,
      data.id,
    );

    if (!existingStaff) {
      throw new NotFoundException('Staff not found');
    }

    const userNamePayload = this.normalizeStaffUserNameInput(data);
    const payload: Record<string, unknown> = {};
    if (data.cccd_number != null) payload.cccdNumber = data.cccd_number;
    const cccdIssuedDateNorm = toDateOrNull(data.cccd_issued_date);
    if (cccdIssuedDateNorm !== undefined)
      payload.cccdIssuedDate = cccdIssuedDateNorm;
    if (data.cccd_issued_place != null)
      payload.cccdIssuedPlace = data.cccd_issued_place;
    const birthDateNorm = toDateOrNull(data.birth_date);
    if (birthDateNorm !== undefined) payload.birthDate = birthDateNorm;
    if (data.university != null) payload.university = data.university;
    if (data.high_school != null) payload.highSchool = data.high_school;
    if (data.specialization != null)
      payload.specialization = data.specialization;
    if (data.bank_account != null) payload.bankAccount = data.bank_account;
    if (data.bank_qr_link != null) payload.bankQrLink = data.bank_qr_link;
    if (data.roles != null) payload.roles = data.roles;
    if (data.user_id != null) payload.userId = data.user_id;
    if (data.status != null) payload.status = data.status;
    if (data.customer_care_managed_by_staff_id !== undefined) {
      payload.customerCareManagedByStaffId =
        data.customer_care_managed_by_staff_id ?? null;
    }

    try {
      const updatedStaffId = await this.prisma.$transaction(async (tx) => {
        const targetUserId = data.user_id ?? existingStaff.userId;

        if (data.user_id != null) {
          const targetUser = await tx.user.findUnique({
            where: { id: data.user_id },
            select: {
              id: true,
              roleType: true,
              staffInfo: {
                select: {
                  id: true,
                },
              },
            },
          });
          if (!targetUser) {
            throw new NotFoundException('User not found');
          }
          if (targetUser.staffInfo && targetUser.staffInfo.id !== data.id) {
            throw new BadRequestException('User này đã có hồ sơ nhân sự.');
          }
          if (
            targetUser.roleType !== UserRole.guest &&
            targetUser.roleType !== UserRole.staff
          ) {
            throw new BadRequestException(
              'Chỉ có thể gán gia sư cho user đang có role guest hoặc staff.',
            );
          }
        }

        if (
          payload.customerCareManagedByStaffId !== undefined &&
          payload.customerCareManagedByStaffId !== null
        ) {
          const manager = await tx.staffInfo.findUnique({
            where: { id: payload.customerCareManagedByStaffId as string },
            select: { roles: true, status: true },
          });
          if (!manager) {
            throw new BadRequestException(
              'Trợ lí được chỉ định không tồn tại.',
            );
          }
          if (!manager.roles.includes(StaffRole.assistant)) {
            throw new BadRequestException(
              'Nhân sự được chỉ định phải có role trợ lí.',
            );
          }
        }

        if (Object.keys(userNamePayload).length > 0) {
          if (!targetUserId) {
            throw new BadRequestException(
              'Không thể cập nhật tên cho nhân sự chưa liên kết user.',
            );
          }

          await tx.user.update({
            where: { id: targetUserId },
            data: userNamePayload,
          });
        }

        await tx.staffInfo.update({
          where: { id: data.id },
          data: payload as Parameters<
            typeof this.prisma.staffInfo.update
          >[0]['data'],
        });

        if (auditActor) {
          const afterValue = await this.getStaffAuditSnapshot(tx, data.id);
          if (afterValue) {
            await this.actionHistoryService.recordUpdate(tx, {
              actor: auditActor,
              entityType: 'staff',
              entityId: data.id,
              description: 'Cập nhật nhân sự',
              beforeValue: existingStaff,
              afterValue,
            });
          }
        }

        return data.id;
      });

      return this.getStaffById(updatedStaffId);
    } catch (error) {
      if (this.isCccdNumberUniqueConstraint(error)) {
        throw new BadRequestException('Số CCCD đã tồn tại trong hệ thống.');
      }
      throw error;
    }
  }

  async deleteStaff(id: string, auditActor?: ActionHistoryActor) {
    const existingStaff = await this.getStaffAuditSnapshot(this.prisma, id);

    if (!existingStaff) {
      throw new NotFoundException('Staff not found');
    }

    const sessionsCount = await this.prisma.session.count({
      where: {
        teacherId: id,
      },
    });
    if (sessionsCount > 0) {
      throw new BadRequestException(
        'Không thể xóa nhân sự vì đang có buổi học liên kết. Vui lòng gỡ phân công hoặc chuyển gia sư cho các buổi học trước.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedStaff = await tx.staffInfo.delete({
        where: {
          id,
        },
      });

      if (auditActor) {
        await this.actionHistoryService.recordDelete(tx, {
          actor: auditActor,
          entityType: 'staff',
          entityId: id,
          description: 'Xóa nhân sự',
          beforeValue: existingStaff,
        });
      }

      return deletedStaff;
    });
  }
  async createStaff(data: CreateStaffDto, auditActor?: ActionHistoryActor) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.user_id,
      },
      select: {
        id: true,
        roleType: true,
        first_name: true,
        last_name: true,
        accountHandle: true,
        email: true,
        staffInfo: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const eligibility = this.getUserEligibilityForStaffAssignment(user);
    if (!eligibility.isEligible) {
      throw new BadRequestException(eligibility.ineligibleReason);
    }

    const userNamePayload = this.normalizeStaffUserNameInput(data);
    if (
      Object.keys(userNamePayload).length === 0 &&
      !getPreferredUserFullName(user)
    ) {
      throw new BadRequestException(
        'Thiếu tên nhân sự. Hãy gửi first_name/last_name hoặc full_name.',
      );
    }

    try {
      const createdStaffId = await this.prisma.$transaction(async (tx) => {
        if (
          data.customer_care_managed_by_staff_id != null &&
          data.customer_care_managed_by_staff_id.trim() !== ''
        ) {
          const manager = await tx.staffInfo.findUnique({
            where: { id: data.customer_care_managed_by_staff_id },
            select: { roles: true },
          });
          if (!manager || !manager.roles.includes(StaffRole.assistant)) {
            throw new BadRequestException(
              'Nhân sự được chỉ định phải có role trợ lí.',
            );
          }
        }

        const createPayload: Record<string, unknown> = {
          cccdNumber: data.cccd_number,
          cccdIssuedDate: toDateOrNull(data.cccd_issued_date) ?? undefined,
          cccdIssuedPlace: data.cccd_issued_place,
          birthDate: toDateOrNull(data.birth_date) ?? undefined,
          university: data.university,
          highSchool: data.high_school,
          specialization: data.specialization,
          bankAccount: data.bank_account,
          bankQrLink: data.bank_qr_link,
          roles: data.roles,
          userId: data.user_id,
          customerCareManagedByStaffId:
            data.customer_care_managed_by_staff_id ?? null,
        };

        if (
          Object.keys(userNamePayload).length > 0 ||
          user.roleType !== UserRole.staff
        ) {
          await tx.user.update({
            where: {
              id: data.user_id,
            },
            data: {
              ...(Object.keys(userNamePayload).length > 0
                ? userNamePayload
                : {}),
              ...(user.roleType !== UserRole.staff
                ? { roleType: UserRole.staff }
                : {}),
            },
          });
        }

        const createdStaff = await tx.staffInfo.create({
          data: createPayload as Parameters<
            typeof this.prisma.staffInfo.create
          >[0]['data'],
        });

        if (auditActor) {
          const afterValue = await this.getStaffAuditSnapshot(
            tx,
            createdStaff.id,
          );
          if (afterValue) {
            await this.actionHistoryService.recordCreate(tx, {
              actor: auditActor,
              entityType: 'staff',
              entityId: createdStaff.id,
              description: 'Tạo nhân sự',
              afterValue,
            });
          }
        }

        return createdStaff.id;
      });

      return this.getStaffById(createdStaffId);
    } catch (error) {
      if (this.isCccdNumberUniqueConstraint(error)) {
        throw new BadRequestException('Số CCCD đã tồn tại trong hệ thống.');
      }
      throw error;
    }
  }

  async uploadCccdImagesByUserId(
    userId: string,
    files: {
      frontImage?: UploadableFile;
      backImage?: UploadableFile;
    },
    auditActor?: ActionHistoryActor,
  ) {
    if (!files.frontImage && !files.backImage) {
      throw new BadRequestException('Vui lòng upload ít nhất một ảnh CCCD.');
    }

    this.validateCccdImageFile(files.frontImage, 'Ảnh CCCD mặt trước');
    this.validateCccdImageFile(files.backImage, 'Ảnh CCCD mặt sau');

    const staff = await this.prisma.staffInfo.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy hồ sơ nhân sự.');
    }

    const supabase = getSupabaseAdminClient();
    const uploadPathBySide: { frontPath?: string; backPath?: string } = {};

    if (files.frontImage) {
      const frontPath = `${userId}-front`;
      const { error } = await supabase.storage
        .from(CCCD_STORAGE_BUCKET)
        .upload(frontPath, files.frontImage.buffer, {
          contentType: files.frontImage.mimetype,
          upsert: true,
        });
      if (error) {
        throw new BadRequestException(
          `Upload ảnh CCCD mặt trước thất bại: ${error.message}`,
        );
      }
      uploadPathBySide.frontPath = frontPath;
    }

    if (files.backImage) {
      const backPath = `${userId}-back`;
      const { error } = await supabase.storage
        .from(CCCD_STORAGE_BUCKET)
        .upload(backPath, files.backImage.buffer, {
          contentType: files.backImage.mimetype,
          upsert: true,
        });
      if (error) {
        throw new BadRequestException(
          `Upload ảnh CCCD mặt sau thất bại: ${error.message}`,
        );
      }
      uploadPathBySide.backPath = backPath;
    }

    const beforeValue = auditActor
      ? await this.getStaffAuditSnapshot(this.prisma, staff.id)
      : null;
    const updatedStaff = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.staffInfo.update({
        where: { id: staff.id },
        data: {
          ...(uploadPathBySide.frontPath
            ? { cccdFrontPath: uploadPathBySide.frontPath }
            : {}),
          ...(uploadPathBySide.backPath
            ? { cccdBackPath: uploadPathBySide.backPath }
            : {}),
        },
      });

      if (auditActor && beforeValue) {
        const afterValue = await this.getStaffAuditSnapshot(tx, staff.id);
        if (afterValue) {
          await this.actionHistoryService.recordUpdate(tx, {
            actor: auditActor,
            entityType: 'staff',
            entityId: staff.id,
            description: 'Cập nhật ảnh CCCD nhân sự',
            beforeValue,
            afterValue,
          });
        }
      }

      return updated;
    });

    return this.attachCccdImageUrls({
      staffId: updatedStaff.id,
      cccdFrontPath: updatedStaff.cccdFrontPath,
      cccdBackPath: updatedStaff.cccdBackPath,
    });
  }
}
