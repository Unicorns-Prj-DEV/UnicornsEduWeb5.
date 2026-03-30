import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class GetAdminDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Month in 01-12 format. Defaults to current month.',
    example: '03',
  })
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'month must use 01-12 format.',
  })
  month?: string;

  @ApiPropertyOptional({
    description: 'Year in YYYY format. Defaults to current year.',
    example: '2026',
  })
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'year must use YYYY format.',
  })
  year?: string;

  @ApiPropertyOptional({
    description: 'Number of rows returned for action alert groups.',
    example: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  alertLimit?: number;

  @ApiPropertyOptional({
    description: 'Number of rows returned for top classes table.',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  topClassLimit?: number;
}

export class GetAdminTopupHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Month in 01-12 format. Defaults to current month.',
    example: '03',
  })
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'month must use 01-12 format.',
  })
  month?: string;

  @ApiPropertyOptional({
    description: 'Year in YYYY format. Defaults to current year.',
    example: '2026',
  })
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'year must use YYYY format.',
  })
  year?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of topup rows returned.',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  limit?: number;
}

export class GetAdminStudentBalanceDetailsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of student rows returned.',
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export interface AdminDashboardPeriodDto {
  month: string;
  year: string;
  monthLabel: string;
}

export interface AdminDashboardSummaryDto {
  activeClasses: number;
  activeStudents: number;
  monthlyTopupTotal: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  monthlyProfit: number;
  prepaidTuitionTotal: number;
  pendingCollectionTotal: number;
  pendingPayrollTotal: number;
  expiringStudentsCount: number;
  debtStudentsCount: number;
  unpaidStaffCount: number;
  totalAlerts: number;
}

export interface AdminDashboardTrendPointDto {
  monthKey: string;
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

export interface AdminDashboardBreakdownItemDto {
  key:
    | 'revenue'
    | 'teacherCost'
    | 'customerCareCost'
    | 'lessonCost'
    | 'bonusCost'
    | 'extraAllowanceCost'
    | 'operatingCost';
  label: string;
  kind: 'revenue' | 'expense';
  amount: number;
}

export interface AdminDashboardActionAlertDto {
  type:
    | 'Sắp hết tiền'
    | 'Chưa thu'
    | 'Nhân sự chưa thanh toán'
    | 'Lớp cảnh báo';
  subject: string;
  owner: string | null;
  due: string;
  amount: number;
  severity: 'warning' | 'destructive' | 'info';
  targetType: 'student' | 'staff' | 'class';
  targetId: string;
}

export interface AdminDashboardClassPerformanceDto {
  classId: string;
  name: string;
  students: number;
  revenue: number;
  profit: number;
  balanceRisk: number;
}

export interface AdminDashboardYearlySummaryDto {
  quarter: string;
  classes: number;
  revenue: number;
  expense: number;
  profit: number;
}

export interface AdminDashboardTopupHistoryItemDto {
  id: string;
  dateTime: string;
  studentName: string;
  amount: number;
  note: string;
  cumulativeBefore: number;
  cumulativeAfter: number;
}

export interface AdminDashboardStudentBalanceItemDto {
  studentId: string;
  studentName: string;
  className: string;
  balance: number;
}

export interface AdminDashboardDto {
  period: AdminDashboardPeriodDto;
  summary: AdminDashboardSummaryDto;
  revenueProfitTrend: AdminDashboardTrendPointDto[];
  breakdown: AdminDashboardBreakdownItemDto[];
  actionAlerts: AdminDashboardActionAlertDto[];
  classPerformance: AdminDashboardClassPerformanceDto[];
  yearlySummary: AdminDashboardYearlySummaryDto[];
}
