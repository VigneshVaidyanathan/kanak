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
