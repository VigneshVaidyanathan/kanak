/**
 * Pure aggregation over transactions, for the insight charts.
 *
 * Everything here is a plain function over arrays so it can be checked without
 * a browser or a Convex client: `npx tsx scripts/check-insights.ts`.
 *
 * ponytail: aggregated on the client. A 12-month window is a few thousand rows,
 * which React chews through in a frame; move it into a Convex query if the
 * window ever grows past a couple of years.
 */

export interface InsightTransaction {
  accountingDate: number;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category?: string;
  isInternal?: boolean;
}

export interface InsightCategory {
  title: string;
  type: string;
  priority?: string;
  color?: string;
}

/** Where a transaction lands in the cashflow picture. */
export type Bucket = 'income' | 'expense' | 'savings' | 'ignore';

const SAVINGS_TYPES = new Set(['savings', 'passive-savings']);

/**
 * Categorised rows follow their category's type. Uncategorised ones fall back
 * to the bank's own credit/debit flag, which over-counts transfers as income —
 * the alternative is silently dropping real spend, which is worse.
 */
export function bucketOf(
  transaction: InsightTransaction,
  categoryTypes: Map<string, string>
): Bucket {
  if (transaction.isInternal === true) return 'ignore';

  const type = transaction.category
    ? categoryTypes.get(transaction.category)
    : undefined;

  if (type === 'intra-transfer') return 'ignore';
  if (type === 'income') return 'income';
  if (type === 'expense') return 'expense';
  if (type && SAVINGS_TYPES.has(type)) return 'savings';

  return transaction.type === 'credit' ? 'income' : 'expense';
}

/**
 * Debit-positive. A credit inside an expense category is a refund, so it has to
 * subtract rather than count as income; the same signing makes a debit inside an
 * income category (a salary clawback) reduce income.
 */
const outflow = (transaction: InsightTransaction) =>
  transaction.type === 'debit' ? transaction.amount : -transaction.amount;

export const monthKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (key: string): string => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
};

export interface MonthBucket {
  key: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  /** income − expense: what did not get spent, whether or not it was moved. */
  net: number;
  /** net / income. Null when there was no income, where a ratio means nothing. */
  savingsRate: number | null;
}

/**
 * One row per calendar month between `from` and `to` inclusive, so a month with
 * no transactions still shows as a gap in the trend instead of vanishing.
 */
export function monthlyBuckets(
  transactions: InsightTransaction[],
  categories: InsightCategory[],
  from: Date,
  to: Date
): MonthBucket[] {
  const categoryTypes = new Map(categories.map((c) => [c.title, c.type]));
  const totals = new Map<
    string,
    { income: number; expense: number; savings: number }
  >();

  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const last = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= last) {
    totals.set(monthKey(cursor.getTime()), {
      income: 0,
      expense: 0,
      savings: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const transaction of transactions) {
    const bucket = bucketOf(transaction, categoryTypes);
    if (bucket === 'ignore') continue;

    const row = totals.get(monthKey(transaction.accountingDate));
    if (!row) continue; // outside the window the caller asked about

    const amount = outflow(transaction);
    if (bucket === 'income') row.income -= amount;
    else row[bucket] += amount;
  }

  return Array.from(totals.entries()).map(([key, row]) => {
    const net = row.income - row.expense;
    return {
      key,
      label: monthLabel(key),
      income: row.income,
      expense: row.expense,
      savings: row.savings,
      net,
      savingsRate: row.income > 0 ? net / row.income : null,
    };
  });
}

/** Actual spend per category, debit-positive. Keyed by category title. */
export function spendByCategory(
  transactions: InsightTransaction[],
  categories: InsightCategory[]
): Map<string, number> {
  const categoryTypes = new Map(categories.map((c) => [c.title, c.type]));
  const spend = new Map<string, number>();

  for (const transaction of transactions) {
    const bucket = bucketOf(transaction, categoryTypes);
    if (bucket !== 'expense' && bucket !== 'savings') continue;
    const key = transaction.category ?? 'Uncategorised';
    spend.set(key, (spend.get(key) ?? 0) + outflow(transaction));
  }

  return spend;
}

export const PRIORITIES = [
  'needs',
  'wants',
  'savings',
  'insurance',
  'liabilities',
] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface PrioritySlice {
  priority: Priority;
  amount: number;
  /** Share of the month's income, or of total outflow when income is 0. */
  share: number;
}

/**
 * The 50/30/20-style split, from actual spend rather than from the budget.
 * A category with no priority set counts as `wants`: the honest default, since
 * an unclassified outflow is the one most likely to be discretionary.
 */
export function prioritySplit(
  transactions: InsightTransaction[],
  categories: InsightCategory[]
): { slices: PrioritySlice[]; income: number; total: number } {
  const priorityOf = new Map(
    categories.map((c) => [c.title, (c.priority ?? 'wants') as Priority])
  );
  const categoryTypes = new Map(categories.map((c) => [c.title, c.type]));

  const amounts = new Map<Priority, number>(PRIORITIES.map((p) => [p, 0]));
  let income = 0;

  for (const transaction of transactions) {
    const bucket = bucketOf(transaction, categoryTypes);
    if (bucket === 'ignore') continue;
    if (bucket === 'income') {
      income -= outflow(transaction);
      continue;
    }
    const priority = transaction.category
      ? (priorityOf.get(transaction.category) ?? 'wants')
      : 'wants';
    amounts.set(priority, (amounts.get(priority) ?? 0) + outflow(transaction));
  }

  const total = PRIORITIES.reduce((sum, p) => sum + (amounts.get(p) ?? 0), 0);
  const base = income > 0 ? income : total;

  return {
    income,
    total,
    slices: PRIORITIES.map((priority) => {
      const amount = amounts.get(priority) ?? 0;
      return { priority, amount, share: base > 0 ? amount / base : 0 };
    }),
  };
}

/**
 * Strip the per-payment noise out of a bank narration so the same merchant
 * lands in one group: reference numbers, UPI handles, dates, rail prefixes.
 */
export function normalizeDescription(description: string): string {
  const cleaned = description
    .toUpperCase()
    .replace(/[@/\-_|*:.,]+/g, ' ')
    .replace(
      /\b(UPI|NEFT|IMPS|RTGS|ACH|POS|ATM|MMT|TXN|REF|PAYMENT|PAY|TO|FROM|DR|CR)\b/g,
      ' '
    )
    .replace(/\b\w*\d\w*\b/g, ' ') // anything with a digit in it is an id, not a name
    .replace(/\s+/g, ' ')
    .trim();

  // Two tokens is enough to tell merchants apart without splitting one merchant
  // across every branch and terminal suffix it uses.
  return cleaned.split(' ').filter(Boolean).slice(0, 2).join(' ') || 'UNKNOWN';
}

export interface Merchant {
  label: string;
  amount: number;
  count: number;
}

/** Biggest outflow destinations in the window, largest first. */
export function topMerchants(
  transactions: InsightTransaction[],
  categories: InsightCategory[],
  limit = 10
): Merchant[] {
  const categoryTypes = new Map(categories.map((c) => [c.title, c.type]));
  const groups = new Map<string, Merchant>();

  for (const transaction of transactions) {
    if (bucketOf(transaction, categoryTypes) !== 'expense') continue;
    const amount = outflow(transaction);
    if (amount <= 0) continue;

    const key = normalizeDescription(transaction.description);
    const group = groups.get(key) ?? { label: key, amount: 0, count: 0 };
    group.amount += amount;
    group.count += 1;
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const CADENCES: Array<{ cadence: Cadence; days: number; perYear: number }> = [
  { cadence: 'weekly', days: 7, perYear: 52 },
  { cadence: 'monthly', days: 30, perYear: 12 },
  { cadence: 'quarterly', days: 91, perYear: 4 },
  { cadence: 'yearly', days: 365, perYear: 1 },
];

const DAY = 24 * 60 * 60 * 1000;

export interface Recurring {
  label: string;
  amount: number;
  cadence: Cadence;
  /** amount × payments per year: what keeping this subscription costs a year. */
  annual: number;
  count: number;
  lastDate: number;
  /** True when the next payment is already more than a cadence overdue. */
  stale: boolean;
}

/**
 * Charges that repeat on a steady cadence for a steady amount — subscriptions,
 * EMIs, rent. Requires three payments before calling anything recurring, and
 * that the amounts agree within 15%, which is what separates Netflix from three
 * unrelated trips to the same supermarket.
 *
 * ponytail: median gap snapped to the nearest standard cadence. It cannot see a
 * plan that changed price mid-window; those show up as two entries.
 */
export function detectRecurring(
  transactions: InsightTransaction[],
  now = Date.now()
): Recurring[] {
  const groups = new Map<string, InsightTransaction[]>();

  for (const transaction of transactions) {
    if (transaction.type !== 'debit' || transaction.isInternal === true)
      continue;
    const key = normalizeDescription(transaction.description);
    if (key === 'UNKNOWN') continue;
    const group = groups.get(key);
    if (group) group.push(transaction);
    else groups.set(key, [transaction]);
  }

  const found: Recurring[] = [];

  for (const [label, group] of groups) {
    if (group.length < 3) continue;

    const dates = group.map((t) => t.accountingDate).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / DAY);
    }
    const medianGap = median(gaps);
    if (medianGap < 4) continue; // several charges a week is shopping, not a plan

    const amounts = group.map((t) => t.amount);
    const medianAmount = median(amounts);
    if (medianAmount <= 0) continue;
    const spread = Math.max(...amounts.map((a) => Math.abs(a - medianAmount)));
    if (spread / medianAmount > 0.15) continue;

    // Nearest standard cadence on a log scale, so 45 days reads as monthly
    // rather than as a third of a quarter.
    const match = CADENCES.reduce((best, candidate) =>
      Math.abs(Math.log(medianGap / candidate.days)) <
      Math.abs(Math.log(medianGap / best.days))
        ? candidate
        : best
    );
    if (Math.abs(Math.log(medianGap / match.days)) > Math.log(1.8)) continue;

    const lastDate = dates[dates.length - 1];
    found.push({
      label,
      amount: medianAmount,
      cadence: match.cadence,
      annual: medianAmount * match.perYear,
      count: group.length,
      lastDate,
      stale: now - lastDate > medianGap * 2 * DAY,
    });
  }

  return found.sort((a, b) => b.annual - a.annual);
}

export interface BurnPoint {
  day: number;
  current: number | null;
  previous: number | null;
}

/**
 * Cumulative spend by day of month, this month against last, so a month can be
 * called early. `current` stops at today rather than flatlining to the 31st,
 * which would read as "spending stopped".
 */
export function burndown(
  transactions: InsightTransaction[],
  categories: InsightCategory[],
  now = new Date()
): { points: BurnPoint[]; currentTotal: number; previousTotal: number } {
  const categoryTypes = new Map(categories.map((c) => [c.title, c.type]));
  const thisKey = monthKey(now.getTime());
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousKey = monthKey(previous.getTime());

  const perDay = {
    current: new Map<number, number>(),
    previous: new Map<number, number>(),
  };

  for (const transaction of transactions) {
    if (bucketOf(transaction, categoryTypes) !== 'expense') continue;
    const key = monthKey(transaction.accountingDate);
    const which =
      key === thisKey ? 'current' : key === previousKey ? 'previous' : null;
    if (!which) continue;
    const day = new Date(transaction.accountingDate).getDate();
    perDay[which].set(
      day,
      (perDay[which].get(day) ?? 0) + outflow(transaction)
    );
  }

  const daysInPrevious = new Date(
    previous.getFullYear(),
    previous.getMonth() + 1,
    0
  ).getDate();
  const daysInCurrent = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const today = now.getDate();

  const points: BurnPoint[] = [];
  let currentRunning = 0;
  let previousRunning = 0;

  for (let day = 1; day <= Math.max(daysInCurrent, daysInPrevious); day++) {
    currentRunning += perDay.current.get(day) ?? 0;
    previousRunning += perDay.previous.get(day) ?? 0;
    points.push({
      day,
      current: day <= today ? currentRunning : null,
      previous: day <= daysInPrevious ? previousRunning : null,
    });
  }

  return {
    points,
    currentTotal: currentRunning,
    previousTotal: previousRunning,
  };
}

export const formatINR = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

/** Lakhs and crores, for axis ticks where the full number will not fit. */
export const formatINRCompact = (value: number): string => {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 10000000)
    return `${sign}₹${(abs / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`;
  if (abs >= 100000)
    return `${sign}₹${(abs / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`;
  if (abs >= 1000)
    return `${sign}₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return `${sign}₹${Math.round(abs)}`;
};

export interface DayFlow {
  day: number;
  /** Midnight local time, so a calendar cell can key off it. */
  date: number;
  income: number;
  expense: number;
  /** Deliberate saving — an SIP, a transfer into a fund. */
  savings: number;
  /** Saving that happens to you: EPF, a loan principal repayment. */
  passiveSavings: number;
  /** Running totals from the 1st, for the month's trajectory. */
  cumIncome: number;
  cumExpense: number;
  cumSavings: number;
  /** What is left of the month's income after spending and saving it. */
  cumLeft: number;
  /** Days after today carry no line — see `burndown`. */
  future: boolean;
}

/**
 * Every day of one month, with that day's flows and the running totals.
 *
 * The calendar reads the per-day numbers, the budget trajectory reads the
 * cumulative ones. Buckets come from `bucketOf`, so an intra-transfer between
 * the family's own accounts lands in neither column.
 */
export function monthTrajectory(
  transactions: InsightTransaction[],
  categories: InsightCategory[],
  year: number,
  month: number,
  now = new Date()
): DayFlow[] {
  const categoryTypes = new Map(categories.map((c) => [c.title, c.type]));
  const daysInMonth = new Date(year, month, 0).getDate();

  const perDay = new Map<
    number,
    { income: number; expense: number; savings: number; passiveSavings: number }
  >();

  for (const transaction of transactions) {
    const date = new Date(transaction.accountingDate);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month) continue;

    if (transaction.isInternal === true) continue;

    // The category's own type decides the column. An uncategorised row has no
    // type to read, so it falls back to the bank's credit/debit flag —
    // over-counting a transfer as income beats dropping real spend.
    const type = transaction.category
      ? categoryTypes.get(transaction.category)
      : undefined;
    if (type === 'intra-transfer') continue;

    const day = date.getDate();
    let totals = perDay.get(day);
    if (!totals) {
      totals = { income: 0, expense: 0, savings: 0, passiveSavings: 0 };
      perDay.set(day, totals);
    }

    // Income is credit-positive, the outflows debit-positive, so a refund or a
    // salary clawback subtracts from its own side instead of crossing over.
    switch (type) {
      case 'income':
        totals.income += -outflow(transaction);
        break;
      case 'expense':
        totals.expense += outflow(transaction);
        break;
      case 'savings':
        totals.savings += outflow(transaction);
        break;
      case 'passive-savings':
        totals.passiveSavings += outflow(transaction);
        break;
      default:
        if (transaction.type === 'credit') totals.income += transaction.amount;
        else totals.expense += transaction.amount;
    }
  }

  // Only the current month has a "today"; a past month is complete and a future
  // one has nothing in it either way.
  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month;
  const today = isCurrentMonth ? now.getDate() : daysInMonth;

  const flows: DayFlow[] = [];
  let cumIncome = 0;
  let cumExpense = 0;
  let cumSavings = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const totals = perDay.get(day) ?? {
      income: 0,
      expense: 0,
      savings: 0,
      passiveSavings: 0,
    };
    cumIncome += totals.income;
    cumExpense += totals.expense;
    cumSavings += totals.savings + totals.passiveSavings;
    flows.push({
      day,
      date: new Date(year, month - 1, day).getTime(),
      ...totals,
      cumIncome,
      cumExpense,
      cumSavings,
      cumLeft: cumIncome - cumExpense - cumSavings,
      future: day > today,
    });
  }

  return flows;
}
