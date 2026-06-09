export type ParsedMonthKey = {
  year: number;
  month: number;
  monthKey: string;
};

export const VIETNAMESE_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return {
    value: String(month).padStart(2, "0"),
    label: `Tháng ${month}`,
  };
});

export function parseMonthKey(
  value?: string | null,
): ParsedMonthKey | null {
  const matched = /^(\d{4})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!matched) {
    return null;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return {
    year,
    month,
    monthKey: `${matched[1]}-${matched[2]}`,
  };
}

export function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getDefaultMonthKey(): string {
  const now = new Date();
  return buildMonthKey(now.getFullYear(), now.getMonth() + 1);
}

export function formatMonthKeyLabel(
  value?: string | null,
  fallback = "—",
): string {
  const parsed = parseMonthKey(value);
  if (!parsed) {
    return value?.trim() || fallback;
  }

  return `Tháng ${parsed.month}/${parsed.year}`;
}

export function formatMonthNumbersLabel(year: number, month: number): string {
  return formatMonthPartsLabel(
    String(month).padStart(2, "0"),
    String(year),
  );
}

export function formatMonthPartsLabel(month: string, year: string): string {
  const monthNumber = Number.parseInt(month, 10);
  const yearNumber = Number.parseInt(year, 10);

  if (
    !Number.isFinite(monthNumber) ||
    !Number.isFinite(yearNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return `Tháng ${month}/${year}`;
  }

  return `Tháng ${monthNumber}/${yearNumber}`;
}

export function buildYearOptions(options?: {
  startYear?: number;
  endYear?: number;
}) {
  const currentYear = new Date().getFullYear();
  const startYear = options?.startYear ?? currentYear - 5;
  const endYear = options?.endYear ?? currentYear + 1;

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => {
    const year = endYear - index;
    return {
      value: String(year),
      label: String(year),
    };
  });
}
