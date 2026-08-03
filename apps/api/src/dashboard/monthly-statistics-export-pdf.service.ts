import { Injectable } from '@nestjs/common';
import { ReceiptPdfService } from 'src/mail/receipt-pdf.service';
import type {
  AdminDashboardMonthlyStatisticDto,
  AdminDashboardMonthlyStatisticsDto,
} from '../dtos/dashboard.dto';

const EXPENSE_SERIES: Array<{
  key: keyof AdminDashboardMonthlyStatisticDto;
  name: string;
  color: string;
}> = [
  { key: 'teacherCost', name: 'Dạy', color: '#2563eb' },
  { key: 'customerCareCost', name: 'CSKH', color: '#db2777' },
  { key: 'lessonCost', name: 'Giáo án', color: '#059669' },
  { key: 'bonusCost', name: 'Bonus', color: '#8b5cf6' },
  { key: 'extraAllowanceCost', name: 'Trợ cấp khác', color: '#ea580c' },
  { key: 'assistantCost', name: 'Trợ lí', color: '#0891b2' },
  { key: 'trainingManagerCost', name: 'QL lớp', color: '#ca8a04' },
  { key: 'operatingCost', name: 'Vận hành', color: '#64748b' },
];

const COLORS = {
  primary: '#2563eb',
  error: '#dc2626',
  success: '#16a34a',
  topup: '#8b5cf6',
  info: '#0ea5e9',
  warning: '#d97706',
  grid: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
};

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)} đ`;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const frac = value / 10 ** exp;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

function buildLegend(
  items: Array<{ label: string; color: string }>,
  x: number,
  y: number,
) {
  return items
    .map((item, index) => {
      const lx = x + index * 110;
      return `
        <rect x="${lx}" y="${y}" width="12" height="12" fill="${item.color}" rx="2"/>
        <text x="${lx + 18}" y="${y + 10}" font-size="11" fill="${COLORS.text}" font-family="Arial, sans-serif">${escapeHtml(item.label)}</text>
      `;
    })
    .join('');
}

function buildAxes(opts: {
  width: number;
  height: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  yMax: number;
  labels: string[];
  yFormatter?: (n: number) => string;
}) {
  const {
    width,
    height,
    padL,
    padR,
    padT,
    padB,
    yMax,
    labels,
    yFormatter = formatCompact,
  } = opts;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = (yMax * i) / ticks;
    const y = padT + plotH - (plotH * i) / ticks;
    return `
      <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${COLORS.grid}" stroke-dasharray="3 3"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${COLORS.muted}" font-family="Arial, sans-serif">${escapeHtml(yFormatter(value))}</text>
    `;
  }).join('');

  const xLabels = labels
    .map((label, i) => {
      const x =
        padL +
        (labels.length === 1 ? plotW / 2 : (plotW * i) / (labels.length - 1));
      return `<text x="${x}" y="${height - 18}" text-anchor="middle" font-size="11" fill="${COLORS.text}" font-family="Arial, sans-serif">${escapeHtml(label)}</text>`;
    })
    .join('');

  return { plotW, plotH, yTicks, xLabels };
}

function financialChartSvg(months: AdminDashboardMonthlyStatisticDto[]) {
  const width = 920;
  const height = 320;
  const padL = 56;
  const padR = 24;
  const padT = 48;
  const padB = 48;
  const labels = months.map((m) => m.month);
  const yMax = niceMax(
    Math.max(
      ...months.flatMap((m) => [m.revenue, m.expense, m.profit, m.totalTopup]),
      1,
    ),
  );
  const { plotW, plotH, yTicks, xLabels } = buildAxes({
    width,
    height,
    padL,
    padR,
    padT,
    padB,
    yMax,
    labels,
  });
  const n = months.length;
  const groupW = plotW / Math.max(n, 1);
  const barW = Math.min(22, groupW * 0.28);
  const bars = months
    .map((m, i) => {
      const cx = padL + groupW * i + groupW / 2;
      const revH = (m.revenue / yMax) * plotH;
      const expH = (m.expense / yMax) * plotH;
      return `
        <rect x="${cx - barW - 2}" y="${padT + plotH - revH}" width="${barW}" height="${revH}" fill="${COLORS.primary}" rx="3"/>
        <rect x="${cx + 2}" y="${padT + plotH - expH}" width="${barW}" height="${expH}" fill="${COLORS.error}" rx="3"/>
      `;
    })
    .join('');
  const linePath = (getter: (m: AdminDashboardMonthlyStatisticDto) => number) =>
    months
      .map((m, i) => {
        const x = padL + groupW * i + groupW / 2;
        const y = padT + plotH - (getter(m) / yMax) * plotH;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  const dots = (
    getter: (m: AdminDashboardMonthlyStatisticDto) => number,
    color: string,
  ) =>
    months
      .map((m, i) => {
        const x = padL + groupW * i + groupW / 2;
        const y = padT + plotH - (getter(m) / yMax) * plotH;
        return `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`;
      })
      .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${buildLegend(
    [
      { label: 'Doanh thu', color: COLORS.primary },
      { label: 'Chi phí', color: COLORS.error },
      { label: 'Lợi nhuận', color: COLORS.success },
      { label: 'Tổng nạp', color: COLORS.topup },
    ],
    padL,
    16,
  )}
  ${yTicks}
  ${bars}
  <path d="${linePath((m) => m.profit)}" fill="none" stroke="${COLORS.success}" stroke-width="2.5"/>
  <path d="${linePath((m) => m.totalTopup)}" fill="none" stroke="${COLORS.topup}" stroke-width="2.5"/>
  ${dots((m) => m.profit, COLORS.success)}
  ${dots((m) => m.totalTopup, COLORS.topup)}
  ${xLabels}
</svg>`;
}

function expenseChartSvg(months: AdminDashboardMonthlyStatisticDto[]) {
  const width = 920;
  const height = 360;
  const padL = 56;
  const padR = 24;
  const padT = 68;
  const padB = 48;
  const labels = months.map((m) => m.month);
  const yMax = niceMax(
    Math.max(
      ...months.flatMap((m) =>
        EXPENSE_SERIES.map((s) => Number(m[s.key]) || 0),
      ),
      1,
    ),
  );
  const { plotW, plotH, yTicks, xLabels } = buildAxes({
    width,
    height,
    padL,
    padR,
    padT,
    padB,
    yMax,
    labels,
  });
  const n = months.length;
  const groupW = plotW / Math.max(n, 1);
  const lines = EXPENSE_SERIES.map((series) => {
    const path = months
      .map((m, i) => {
        const x = padL + groupW * i + groupW / 2;
        const y = padT + plotH - (Number(m[series.key]) / yMax) * plotH;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
    const dots = months
      .map((m, i) => {
        const x = padL + groupW * i + groupW / 2;
        const y = padT + plotH - (Number(m[series.key]) / yMax) * plotH;
        return `<circle cx="${x}" cy="${y}" r="2.8" fill="${series.color}"/>`;
      })
      .join('');
    return `<path d="${path}" fill="none" stroke="${series.color}" stroke-width="2"/>${dots}`;
  }).join('');
  const legendRows = [EXPENSE_SERIES.slice(0, 4), EXPENSE_SERIES.slice(4)]
    .map((row, rowIndex) =>
      buildLegend(
        row.map((s) => ({ label: s.name, color: s.color })),
        padL,
        12 + rowIndex * 18,
      ),
    )
    .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${legendRows}
  ${yTicks}
  ${lines}
  ${xLabels}
</svg>`;
}

function operationsChartSvg(months: AdminDashboardMonthlyStatisticDto[]) {
  const width = 920;
  const height = 300;
  const padL = 48;
  const padR = 24;
  const padT = 48;
  const padB = 48;
  const labels = months.map((m) => m.month);
  const yMax = niceMax(
    Math.max(
      ...months.flatMap((m) => [m.students, m.classes, m.teachers]),
      1,
    ),
  );
  const { plotW, plotH, yTicks, xLabels } = buildAxes({
    width,
    height,
    padL,
    padR,
    padT,
    padB,
    yMax,
    labels,
    yFormatter: (n) => String(Math.round(n)),
  });
  const n = months.length;
  const groupW = plotW / Math.max(n, 1);
  const barW = Math.min(16, groupW * 0.22);
  const bars = months
    .map((m, i) => {
      const cx = padL + groupW * i + groupW / 2;
      const series = [
        { value: m.students, color: COLORS.primary, offset: -barW - 2 },
        { value: m.classes, color: COLORS.info, offset: 0 },
        { value: m.teachers, color: COLORS.warning, offset: barW + 2 },
      ];
      return series
        .map((s) => {
          const h = (s.value / yMax) * plotH;
          return `<rect x="${cx + s.offset - barW / 2}" y="${padT + plotH - h}" width="${barW}" height="${h}" fill="${s.color}" rx="2"/>`;
        })
        .join('');
    })
    .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${buildLegend(
    [
      { label: 'Học sinh', color: COLORS.primary },
      { label: 'Lớp học', color: COLORS.info },
      { label: 'Gia sư', color: COLORS.warning },
    ],
    padL,
    16,
  )}
  ${yTicks}
  ${bars}
  ${xLabels}
</svg>`;
}

function renderTable(headers: string[], rows: string[][]) {
  return `
    <table>
      <thead>
        <tr>${headers.map((h) => `<th class="num">${escapeHtml(h)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, i) =>
                  i === 0
                    ? `<td>${escapeHtml(cell)}</td>`
                    : `<td class="num">${escapeHtml(cell)}</td>`,
                )
                .join('')}</tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

/** Render thống kê theo tháng (charts SVG + bảng) sang PDF qua ReceiptPdfService. */
@Injectable()
export class MonthlyStatisticsExportPdfService {
  constructor(private readonly receiptPdfService: ReceiptPdfService) {}

  private buildHtml(payload: AdminDashboardMonthlyStatisticsDto) {
    const months = payload.months;
    const generatedAt = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());
    const rangeLabel = `${payload.fromMonthKey} → ${payload.toMonthKey}`;

    const financeTable = renderTable(
      ['Tháng', 'Doanh thu', 'Chi phí', 'Lợi nhuận', 'Tổng nạp'],
      months.map((m) => [
        m.monthKey,
        formatCurrency(m.revenue),
        formatCurrency(m.expense),
        formatCurrency(m.profit),
        formatCurrency(m.totalTopup),
      ]),
    );

    const expenseTable = renderTable(
      ['Tháng', ...EXPENSE_SERIES.map((s) => s.name), 'Tổng'],
      months.map((m) => [
        m.monthKey,
        ...EXPENSE_SERIES.map((s) => formatCurrency(Number(m[s.key]) || 0)),
        formatCurrency(m.expense),
      ]),
    );

    const opsTable = renderTable(
      ['Tháng', 'Học sinh', 'Lớp học', 'Gia sư'],
      months.map((m) => [
        m.monthKey,
        String(m.students),
        String(m.classes),
        String(m.teachers),
      ]),
    );

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Thống kê theo tháng — ${escapeHtml(rangeLabel)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: #111;
      margin: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 13px; margin: 20px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .meta { color: #555; margin-bottom: 12px; }
    .chart { width: 100%; max-width: 920px; margin: 8px 0 12px; }
    .chart svg { width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 10px; }
    th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 600; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .note { color: #666; font-style: italic; margin: 0 0 6px; }
  </style>
</head>
<body>
  <h1>Thống kê theo tháng — Unicorns Edu</h1>
  <p class="meta">Kỳ: <strong>${escapeHtml(rangeLabel)}</strong> · Xuất lúc ${escapeHtml(generatedAt)}</p>

  <h2>1. Doanh thu · Chi phí · Lợi nhuận</h2>
  <p class="note">Doanh thu và chi phí theo buổi học thực tế; tổng chi phí = nhân sự + vận hành.</p>
  <div class="chart">${financialChartSvg(months)}</div>
  ${financeTable}

  <h2>2. Chi phí theo từng khoản</h2>
  <p class="note">8 khoản: dạy, CSKH, giáo án, bonus, trợ cấp khác, trợ lí, quản lý lớp, vận hành.</p>
  <div class="chart">${expenseChartSvg(months)}</div>
  ${expenseTable}

  <h2>3. Học sinh · Lớp học · Gia sư</h2>
  <p class="note">Học sinh: active cuối tháng. Lớp/gia sư: có buổi học trong tháng.</p>
  <div class="chart">${operationsChartSvg(months)}</div>
  ${opsTable}
</body>
</html>`;
  }

  async toPdfBuffer(
    payload: AdminDashboardMonthlyStatisticsDto,
  ): Promise<Buffer> {
    const html = this.buildHtml(payload);
    const buffer = await this.receiptPdfService.renderToPdf(html, {
      landscape: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    if (!buffer) {
      throw new Error(
        'Không tạo được PDF (Chromium không khả dụng trên server).',
      );
    }
    return buffer;
  }
}
