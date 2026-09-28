import type { FileContent } from '@/store/csv-upload-store';
import { parse as parseCsv } from 'csv-parse/sync';

/**
 * Turn CSV parse errors into a short, user-friendly message.
 */
export function getParseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message || '';
    if (msg.toLowerCase().includes('quote')) {
      return 'Invalid or unclosed quotes in the CSV. Check that every quoted value is properly closed.';
    }
    if (
      msg.toLowerCase().includes('delimiter') ||
      msg.toLowerCase().includes('column')
    ) {
      return 'The CSV structure seems invalid. Make sure the file uses commas to separate columns.';
    }
    return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
  }
  return 'The file could not be read. Please ensure it is a valid CSV file.';
}

/**
 * Validate the CSV structure and return the parsed table.
 * Throws with a descriptive message when the structure is unusable.
 */
export function parseCsvStructure(content: string): FileContent {
  const rows = parseCsv(content, {
    skip_empty_lines: true,
    delimiter: ',',
  }) as string[][];

  if (!rows || rows.length === 0) {
    throw new Error(
      'The file is empty or has no valid rows. Please upload a CSV with a header row and at least one data row.'
    );
  }

  const headers = rows[0];
  if (
    !headers ||
    headers.length === 0 ||
    headers.every((h: string) => !h?.trim())
  ) {
    throw new Error(
      'The file has no column headers. The first row should contain column names.'
    );
  }

  return { headers, rows: rows.slice(1), totalRows: rows.length - 1 };
}

/**
 * Pick the header row of a sheet. Bank exports (ICICI and friends) put a logo,
 * account details and search filters above the real table, so the first row is
 * usually not the header. The widest row that is followed by rows of the same
 * shape is.
 */
function findHeaderRow(rows: unknown[][]): number {
  const filled = rows.map(
    (row) => row.filter((cell) => String(cell ?? '').trim() !== '').length
  );
  const widest = Math.max(...filled, 0);
  if (widest === 0) return 0;
  // ponytail: first row that hits the widest count wins; good enough for bank
  // exports where the table is the widest thing in the sheet.
  return filled.findIndex((count) => count === widest);
}

/**
 * Convert the first sheet of an Excel workbook into CSV text so the rest of the
 * upload flow (clean, map, verify) stays identical to the CSV path.
 */
export async function excelToCsv(buffer: ArrayBuffer): Promise<string> {
  // ponytail: dynamic import keeps the ~1MB sheet parser out of the main bundle.
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    // Date cells carry the workbook's own format; force the one we parse.
    dateNF: 'dd/mm/yyyy',
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(
      'The workbook has no sheets. Please upload a file with at least one sheet.'
    );
  }

  // ponytail: first sheet only, add a sheet picker if statements ever span tabs.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });

  const table = rows
    .slice(findHeaderRow(rows))
    .map((row) => row.map((cell) => String(cell ?? '').trim()));

  if (table.length === 0) {
    throw new Error(
      'The sheet is empty. Please upload a file with a header row and at least one data row.'
    );
  }

  // Drop the trailing columns the header does not cover (notes, totals, blanks).
  const width = table[0].length;
  return XLSX.utils.sheet_to_csv(
    XLSX.utils.aoa_to_sheet(table.map((row) => row.slice(0, width)))
  );
}

export function isExcelFile(fileName: string): boolean {
  return /\.(xlsx|xls)$/i.test(fileName);
}
