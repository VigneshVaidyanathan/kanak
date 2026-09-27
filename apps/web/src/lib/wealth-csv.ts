import { parse } from 'csv-parse/sync';

export type ParsedWealthLineItem = {
  name: string;
  /** dateKey (YYYY-MM-DD) -> amount */
  amounts: Record<string, number>;
};

export type ParsedWealthSection = {
  name: string;
  operation: 'add' | 'subtract';
  lineItems: ParsedWealthLineItem[];
};

export type ParsedWealthCsv = {
  dates: string[];
  sections: ParsedWealthSection[];
};

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** "11-Sep-26" / "03-Jul-25" -> "2026-09-11". Returns null if not a date. */
function parseHeaderDate(raw: string): string | null {
  const parts = raw.trim().split('-');
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = MONTHS.indexOf(parts[1].toLowerCase().slice(0, 3));
  const year = Number(parts[2]);
  if (!day || month < 0 || !Number.isFinite(year)) return null;
  const fullYear = year < 100 ? 2000 + year : year;
  return `${fullYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "₹6,92,375" -> 692375, "-₹1,601" -> -1601, "" -> null */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parses the "Complete Wealth" sheet layout:
 *   row of dates across the columns, then repeating blocks of
 *   `<Section name>` (label only, no values), its line items,
 *   and a closing total row whose label repeats the section name.
 * Everything outside a section block (change rows, grand totals, notes) is ignored.
 */
export function parseWealthCsv(csv: string): ParsedWealthCsv {
  const rows: string[][] = parse(csv, {
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: false,
  });

  // Date header = first row with at least two parseable dates.
  let headerIndex = -1;
  let dateByColumn: (string | null)[] = [];
  for (let i = 0; i < rows.length; i++) {
    const candidate = rows[i].map((cell) => parseHeaderDate(cell ?? ''));
    if (candidate.filter(Boolean).length >= 2) {
      headerIndex = i;
      dateByColumn = candidate;
      break;
    }
  }
  if (headerIndex === -1) {
    throw new Error('Could not find a row of dates in the CSV');
  }

  const dates = dateByColumn.filter((d): d is string => d !== null);
  const duplicate = dates.find((d, i) => dates.indexOf(d) !== i);
  if (duplicate) {
    throw new Error(`Duplicate date column in the CSV: ${duplicate}`);
  }

  const sections: ParsedWealthSection[] = [];
  let current: ParsedWealthSection | null = null;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const label = (row[0] ?? '').trim();
    const hasValues = row.some(
      (cell, col) =>
        col > 0 && dateByColumn[col] && parseAmount(cell ?? '') !== null
    );

    if (!label) continue;

    if (!hasValues) {
      // Section header (a label with no numbers). Notes below the table land here too,
      // but they never get line items because a total row closes the last section.
      current = {
        name: label,
        operation: /liabilit|loan/i.test(label) ? 'subtract' : 'add',
        lineItems: [],
      };
      sections.push(current);
      continue;
    }

    if (!current) continue; // stray totals / notes outside any section

    if (label.toLowerCase() === current.name.toLowerCase()) {
      current = null; // section total row closes the block
      continue;
    }

    const amounts: Record<string, number> = {};
    for (let col = 1; col < row.length; col++) {
      const dateKey = dateByColumn[col];
      if (!dateKey) continue;
      const amount = parseAmount(row[col] ?? '');
      if (amount === null) continue;
      if (amount < 0) {
        throw new Error(
          `Negative amount ${row[col]} for "${label}" on ${dateKey} (row ${i + 1})`
        );
      }
      amounts[dateKey] = amount;
    }
    current.lineItems.push({ name: label, amounts });
  }

  // Drop empty trailing "sections" created by note rows.
  return { dates, sections: sections.filter((s) => s.lineItems.length > 0) };
}
