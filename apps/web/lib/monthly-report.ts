import type {
  MonthlyReportDropOutGroupCount,
  MonthlyReportDropOutGroupKey,
  MonthlyReportMatrixCell,
} from "@/dtos/dashboard.dto";
import {
  STUDENT_CUSTOMER_SOURCE_LABELS,
  STUDENT_CUSTOMER_SOURCES,
  STUDENT_DROP_OUT_REASON_GROUP_LABELS,
  STUDENT_DROP_OUT_REASON_GROUP_UNCLASSIFIED_LABEL,
  type StudentCustomerSource,
} from "@/dtos/student.dto";
import { formatVnInteger } from "@/lib/formatters";

/** Cột/hàng «không có» trong ma trận: chưa gán nguồn hoặc chưa xếp lớp. */
export const MONTHLY_REPORT_NONE_KEY = "__none__";
export const MONTHLY_REPORT_UNPLACED_LABEL = "Chưa xếp lớp";
export const MONTHLY_REPORT_NO_SOURCE_LABEL = "Chưa gán nguồn";

/** Bốn nhóm giữ lại được; hai nhóm tự nhiên khó giữ; còn lại là Khác/Chưa phân loại. */
export const INTERVENABLE_DROP_OUT_GROUPS: MonthlyReportDropOutGroupKey[] = [
  "busy_schedule",
  "no_suitable_class",
  "trial_only",
  "tuition",
];
export const NATURAL_DROP_OUT_GROUPS: MonthlyReportDropOutGroupKey[] = [
  "exam_done",
  "changed_direction",
];
export const OTHER_DROP_OUT_GROUPS: MonthlyReportDropOutGroupKey[] = ["other", "unclassified"];

export function formatDropOutGroupKey(group: MonthlyReportDropOutGroupKey): string {
  return group === "unclassified"
    ? STUDENT_DROP_OUT_REASON_GROUP_UNCLASSIFIED_LABEL
    : STUDENT_DROP_OUT_REASON_GROUP_LABELS[group];
}

export function formatCustomerSourceKey(source: StudentCustomerSource | null): string {
  return source ? STUDENT_CUSTOMER_SOURCE_LABELS[source] : MONTHLY_REPORT_NO_SOURCE_LABEL;
}

export function sumDropOutGroups(
  counts: MonthlyReportDropOutGroupCount[],
  groups: MonthlyReportDropOutGroupKey[],
): number {
  return counts
    .filter((row) => groups.includes(row.group))
    .reduce((total, row) => total + row.count, 0);
}

/** «12,5 tr» cho số tiền lớn; dưới 1 triệu hiện đủ số. */
export function formatMillions(value: number): string {
  if (Math.abs(value) < 1_000_000) return `${formatVnInteger(value)} đ`;
  return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
}

export function formatSignedCount(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

export type MonthlyReportMatrixTotals = {
  newCount: number;
  earlyDropCount: number;
  paidCount: number;
  totalTopUp: number;
};

export type MonthlyReportMatrixView = {
  /** Thứ tự cột: id khoá, cuối cùng là `MONTHLY_REPORT_NONE_KEY` nếu có học sinh chưa xếp lớp. */
  columnKeys: string[];
  /** Thứ tự hàng theo enum nguồn khách, chỉ nguồn có học sinh; chưa gán nguồn ở cuối. */
  rowKeys: string[];
  cell: (rowKey: string, columnKey: string) => MonthlyReportMatrixTotals;
  rowTotal: (rowKey: string) => MonthlyReportMatrixTotals;
  columnTotal: (columnKey: string) => MonthlyReportMatrixTotals;
  grandTotal: MonthlyReportMatrixTotals;
  /** Ô tổng nạp lớn nhất, dùng chuẩn hoá heatmap. */
  maxCellTopUp: number;
};

const EMPTY_TOTALS: MonthlyReportMatrixTotals = {
  newCount: 0,
  earlyDropCount: 0,
  paidCount: 0,
  totalTopUp: 0,
};

function addTotals(
  a: MonthlyReportMatrixTotals,
  b: MonthlyReportMatrixTotals,
): MonthlyReportMatrixTotals {
  return {
    newCount: a.newCount + b.newCount,
    earlyDropCount: a.earlyDropCount + b.earlyDropCount,
    paidCount: a.paidCount + b.paidCount,
    totalTopUp: a.totalTopUp + b.totalTopUp,
  };
}

/** Dựng ma trận Nguồn khách × Khoá học từ danh sách ô thưa của API. */
export function buildMonthlyReportMatrix(
  cells: MonthlyReportMatrixCell[],
  courseIds: string[],
): MonthlyReportMatrixView {
  const byKey = new Map<string, MonthlyReportMatrixTotals>();
  const rowSet = new Set<string>();
  let hasUnplaced = false;
  for (const cell of cells) {
    const rowKey = cell.customerSource ?? MONTHLY_REPORT_NONE_KEY;
    const columnKey = cell.courseId ?? MONTHLY_REPORT_NONE_KEY;
    if (columnKey === MONTHLY_REPORT_NONE_KEY) hasUnplaced = true;
    rowSet.add(rowKey);
    const key = `${rowKey}|${columnKey}`;
    byKey.set(key, addTotals(byKey.get(key) ?? EMPTY_TOTALS, cell));
  }

  const columnKeys = hasUnplaced ? [...courseIds, MONTHLY_REPORT_NONE_KEY] : [...courseIds];
  const rowKeys = [
    ...STUDENT_CUSTOMER_SOURCES.filter((source) => rowSet.has(source)),
    ...(rowSet.has(MONTHLY_REPORT_NONE_KEY) ? [MONTHLY_REPORT_NONE_KEY] : []),
  ];
  const cell = (rowKey: string, columnKey: string) =>
    byKey.get(`${rowKey}|${columnKey}`) ?? EMPTY_TOTALS;
  const rowTotal = (rowKey: string) =>
    columnKeys.reduce((total, columnKey) => addTotals(total, cell(rowKey, columnKey)), EMPTY_TOTALS);
  const columnTotal = (columnKey: string) =>
    rowKeys.reduce((total, rowKey) => addTotals(total, cell(rowKey, columnKey)), EMPTY_TOTALS);

  return {
    columnKeys,
    rowKeys,
    cell,
    rowTotal,
    columnTotal,
    grandTotal: rowKeys.reduce((total, rowKey) => addTotals(total, rowTotal(rowKey)), EMPTY_TOTALS),
    maxCellTopUp: Math.max(0, ...[...byKey.values()].map((totals) => totals.totalTopUp)),
  };
}

/** Thứ tự cột nhóm lý do trong bảng (khớp thứ tự API). */
export const MONTHLY_REPORT_DROP_OUT_GROUP_ORDER: MonthlyReportDropOutGroupKey[] = [
  ...INTERVENABLE_DROP_OUT_GROUPS,
  ...NATURAL_DROP_OUT_GROUPS,
  ...OTHER_DROP_OUT_GROUPS,
];
