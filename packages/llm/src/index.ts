import { choice, TypeSafeClient } from '@typesafe-ai/sdk';

export type MappableProperty = {
  /** Kanak field name, e.g. "withdrawalAmount" */
  value: string;
  label: string;
  description?: string;
};

export type ColumnSuggestion = {
  /** index into `headers`, or undefined when no column matches */
  headerIndex?: number;
  confidence: number;
};

export type MapColumnsResult = {
  /** property value -> suggestion */
  columns: Record<string, ColumnSuggestion>;
  dateFormat?: string;
};

export const DATE_FORMATS = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM-DD-YYYY',
  'DD.MM.YYYY',
  'YYYY/MM/DD',
] as const;

const NONE = 'no_matching_column';
// ponytail: single global threshold; per-field tuning only if users complain.
const MIN_CONFIDENCE = 0.5;

const colKey = (i: number) => `column_${i}`;

/**
 * OpenRouter proxies TypeSafe's `/v1/systemone` unchanged, so the SDK only
 * needs a different base URL and model name. Falls back to calling
 * api.typesafe.ai directly when only a TypeSafe key is set.
 */
export function createClient(): TypeSafeClient {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return new TypeSafeClient({
      apiKey: openRouterKey,
      baseURL: 'https://openrouter.ai/api',
      defaultModel: process.env.JEV_MODEL || '~typesafe/jev-latest',
    });
  }
  return new TypeSafeClient({ defaultModel: process.env.JEV_MODEL });
}

/**
 * Ask Jev (TypeSafe System One) to match CSV headers to Kanak transaction
 * fields. One Choice question per field plus one for the date format — they
 * all run in parallel inside a single API call.
 */
export async function mapCsvColumns({
  headers,
  rows,
  properties,
  client = createClient(),
}: {
  headers: string[];
  rows: string[][];
  properties: MappableProperty[];
  client?: TypeSafeClient;
}): Promise<MapColumnsResult> {
  if (!headers.length || !properties.length) return { columns: {} };

  const samples = rows.slice(0, 5);

  // Each option carries its header name and sample values, so the model sees
  // both the label and the actual data shape.
  const options: Record<string, string> = { [NONE]: 'No column matches' };
  headers.forEach((header, i) => {
    const values = samples
      .map((r) => r[i])
      .filter((v) => v !== undefined && v !== '')
      .join(' | ');
    options[colKey(i)] = `Header "${header || '(blank)'}"; sample values: ${
      values || '(empty)'
    }`;
  });

  const questions: Record<string, unknown> = {};
  for (const p of properties) {
    questions[p.value] = choice(
      `Which CSV column holds the "${p.label}"? ${p.description ?? ''}`.trim(),
      options
    );
  }
  questions.dateFormat = choice(
    'Which date format do the date values in this CSV use?',
    Object.fromEntries(DATE_FORMATS.map((f) => [f, null]))
  );

  const response = await client.systemOne({
    state: {
      headers,
      sampleRows: samples,
      domain: 'A bank account statement exported as CSV.',
    },
    questions: questions as any,
  });

  const answers = response.answers as Record<
    string,
    { choice: string; confidence: number }
  >;

  const columns: Record<string, ColumnSuggestion> = {};
  const claimed = new Map<number, string>(); // headerIndex -> property
  for (const p of properties) {
    const a = answers[p.value];
    if (!a || a.choice === NONE || a.confidence < MIN_CONFIDENCE) continue;
    const index = Number(a.choice.replace('column_', ''));
    if (!Number.isInteger(index) || !headers[index]) continue;

    // One CSV column can only feed one field: keep the better match.
    const owner = claimed.get(index);
    if (owner) {
      if (columns[owner].confidence >= a.confidence) continue;
      delete columns[owner];
    }
    claimed.set(index, p.value);
    columns[p.value] = { headerIndex: index, confidence: a.confidence };
  }

  const df = answers.dateFormat;
  return {
    columns,
    dateFormat: df && df.confidence >= MIN_CONFIDENCE ? df.choice : undefined,
  };
}
