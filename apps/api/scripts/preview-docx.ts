/**
 * Generate Full_Database_Preview.docx with one section per table,
 * each showing first 30 rows for manual review.
 */
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  TextRun,
  BorderStyle,
  WidthType,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';

const PREVIEW_ROWS = 30;

export interface TablePreview {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

function safeString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  return s.length > 100 ? s.slice(0, 97) + '...' : s;
}

function buildTableSection(tableName: string, columns: string[], rows: Record<string, unknown>[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: columns.map(
      (col) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: col, bold: true })],
            }),
          ],
          shading: { fill: 'E0E0E0' },
        })
    ),
  });
  const dataRows = rows.slice(0, PREVIEW_ROWS).map((row) => {
    return new TableRow({
      children: columns.map((col) => {
        const value = row[col];
        return new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: safeString(value) })],
            }),
          ],
        });
      }),
    });
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [headerRow, ...dataRows],
  });
}

/**
 * Generate Full_Database_Preview.docx from collected table data.
 * Each section = one table name + table with first 30 rows.
 */
export async function generatePreviewDocx(
  outputPath: string,
  tables: TablePreview[]
): Promise<void> {
  const sections = tables.map(({ tableName, columns, rows }) => ({
    children: [
      new Paragraph({
        text: tableName,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        text: `First ${Math.min(PREVIEW_ROWS, rows.length)} rows (preview).`,
        spacing: { after: 200 },
      }),
      buildTableSection(tableName, columns, rows),
      new Paragraph({ text: '', spacing: { after: 400 } }),
    ],
  }));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Full Database Preview',
            heading: HeadingLevel.TITLE,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: 'Migration + anonymization + augmentation. Review before syncing to DB.',
            spacing: { after: 600 },
          }),
          ...sections.flatMap((s) => s.children),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const dir = path.dirname(outputPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, buffer);
}

/**
 * Build TablePreview from array of row objects: columns = union of keys, rows = data.
 */
export function toTablePreview(tableName: string, rows: Record<string, unknown>[]): TablePreview {
  const columnSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) columnSet.add(key);
  }
  const columns = Array.from(columnSet).sort();
  return { tableName, columns, rows };
}
