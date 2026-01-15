import { DateFormat } from '@/store/csv-upload-store';

export function parseDateByFormat(dateStr: string, format: DateFormat): Date {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    throw new Error('Date is empty');
  }

  // Auto-detect mode - try multiple formats
  if (format === 'auto') {
    // Try DD/MM/YYYY first (common in Indian bank statements)
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, dayStr, monthStr, yearStr] = ddmmyyyyMatch;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try ISO format
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    throw new Error(`Invalid date format: ${trimmed}`);
  }

  // Parse based on specific format
  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;
  let match: RegExpMatchArray | null = null;

  switch (format) {
    case 'DD/MM/YYYY':
      match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        [, day, month, year] = match.map(Number);
      }
      break;
    case 'MM/DD/YYYY':
      match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        [, month, day, year] = match.map(Number);
      }
      break;
    case 'YYYY-MM-DD':
      match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (match) {
        [, year, month, day] = match.map(Number);
      }
      break;
    case 'DD-MM-YYYY':
      match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (match) {
        [, day, month, year] = match.map(Number);
      }
      break;
    case 'MM-DD-YYYY':
      match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
      if (match) {
        [, month, day, year] = match.map(Number);
      }
      break;
    case 'DD.MM.YYYY':
      match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (match) {
        [, day, month, year] = match.map(Number);
      }
      break;
    case 'YYYY/MM/DD':
      match = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (match) {
        [, year, month, day] = match.map(Number);
      }
      break;
  }

  if (
    !match ||
    day === undefined ||
    month === undefined ||
    year === undefined
  ) {
    // Fallback to standard Date parsing
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${trimmed} (expected ${format})`);
    }
    return date;
  }

  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${trimmed} (parsed as ${format})`);
  }

  return date;
}
