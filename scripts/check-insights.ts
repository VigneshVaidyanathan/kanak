/**
 * The aggregation behind the insight charts. Run: npx tsx scripts/check-insights.ts
 *
 * The cases below are the ones that silently produce a plausible-looking wrong
 * chart: a refund inside an expense category counting as income, a transfer
 * between own accounts inflating both sides, an empty month disappearing from a
 * trend, and a weekly supermarket run being reported as a subscription.
 */
import assert from 'node:assert';
import {
  burndown,
  detectRecurring,
  formatINRCompact,
  monthlyBuckets,
  monthTrajectory,
  normalizeDescription,
  prioritySplit,
  topMerchants,
  type InsightCategory,
  type InsightTransaction,
} from '../apps/web/src/lib/insights';

const categories: InsightCategory[] = [
  { title: 'Salary', type: 'income', priority: undefined },
  { title: 'Groceries', type: 'expense', priority: 'needs' },
  { title: 'Eating Out', type: 'expense', priority: 'wants' },
  { title: 'Mutual Funds', type: 'savings', priority: 'savings' },
  { title: 'EPF', type: 'passive-savings', priority: 'savings' },
  { title: 'Card Payment', type: 'intra-transfer' },
];

const at = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day).getTime();

const txn = (
  overrides: Partial<InsightTransaction> & { accountingDate: number }
): InsightTransaction => ({
  description: 'SOMETHING',
  amount: 100,
  type: 'debit',
  ...overrides,
});

// --- monthly buckets ---------------------------------------------------------
{
  const transactions = [
    txn({
      accountingDate: at(2026, 1, 5),
      amount: 100000,
      type: 'credit',
      category: 'Salary',
    }),
    txn({
      accountingDate: at(2026, 1, 7),
      amount: 20000,
      category: 'Groceries',
    }),
    // A refund of part of that grocery spend: must reduce expense, not add income.
    txn({
      accountingDate: at(2026, 1, 9),
      amount: 5000,
      type: 'credit',
      category: 'Groceries',
    }),
    txn({
      accountingDate: at(2026, 1, 10),
      amount: 30000,
      category: 'Mutual Funds',
    }),
    // Own-account transfer, both legs: must not touch income or expense.
    txn({
      accountingDate: at(2026, 1, 11),
      amount: 50000,
      category: 'Card Payment',
    }),
    txn({
      accountingDate: at(2026, 1, 12),
      amount: 9999,
      category: 'Groceries',
      isInternal: true,
    }),
    txn({
      accountingDate: at(2026, 3, 3),
      amount: 40000,
      category: 'Groceries',
    }),
  ];

  const buckets = monthlyBuckets(
    transactions,
    categories,
    new Date(2026, 0, 1),
    new Date(2026, 2, 31)
  );

  assert.deepStrictEqual(
    buckets.map((b) => b.key),
    ['2026-01', '2026-02', '2026-03'],
    'an empty February must still appear as a gap in the trend'
  );

  const january = buckets[0];
  assert.strictEqual(january.income, 100000);
  assert.strictEqual(
    january.expense,
    15000,
    'refund reduces expense, internal row ignored'
  );
  assert.strictEqual(january.savings, 30000);
  assert.strictEqual(january.net, 85000);
  assert.strictEqual(january.savingsRate, 0.85);

  assert.strictEqual(
    buckets[1].savingsRate,
    null,
    'no income means no ratio, not zero'
  );
  assert.strictEqual(buckets[2].expense, 40000);
}

// --- uncategorised fallback --------------------------------------------------
{
  const buckets = monthlyBuckets(
    [
      txn({ accountingDate: at(2026, 5, 2), amount: 700 }),
      txn({ accountingDate: at(2026, 5, 3), amount: 1200, type: 'credit' }),
    ],
    categories,
    new Date(2026, 4, 1),
    new Date(2026, 4, 31)
  );
  assert.strictEqual(buckets[0].expense, 700);
  assert.strictEqual(buckets[0].income, 1200);
}

// --- priority split ---------------------------------------------------------
{
  const { slices, income } = prioritySplit(
    [
      txn({
        accountingDate: at(2026, 2, 1),
        amount: 100000,
        type: 'credit',
        category: 'Salary',
      }),
      txn({
        accountingDate: at(2026, 2, 2),
        amount: 50000,
        category: 'Groceries',
      }),
      txn({
        accountingDate: at(2026, 2, 3),
        amount: 30000,
        category: 'Eating Out',
      }),
      txn({
        accountingDate: at(2026, 2, 4),
        amount: 20000,
        category: 'Mutual Funds',
      }),
    ],
    categories
  );
  assert.strictEqual(income, 100000);
  const share = new Map(slices.map((s) => [s.priority, s.share]));
  assert.strictEqual(share.get('needs'), 0.5);
  assert.strictEqual(share.get('wants'), 0.3);
  assert.strictEqual(share.get('savings'), 0.2);
}

// --- description normalisation ----------------------------------------------
{
  assert.strictEqual(
    normalizeDescription('UPI/DR/402938471/NETFLIX INDIA/HDFC/netflix@icici'),
    'NETFLIX INDIA'
  );
  assert.strictEqual(
    normalizeDescription('POS 4512XXXX8891 BIG BAZAAR KORAMANGALA'),
    'BIG BAZAAR'
  );
  // Same merchant, different reference each month: must collapse to one key.
  assert.strictEqual(
    normalizeDescription('NEFT-000123-SPOTIFY'),
    normalizeDescription('NEFT-999888-SPOTIFY')
  );
}

// --- top merchants ----------------------------------------------------------
{
  const merchants = topMerchants(
    [
      txn({
        accountingDate: at(2026, 1, 1),
        amount: 500,
        description: 'UPI/1/SWIGGY',
        category: 'Eating Out',
      }),
      txn({
        accountingDate: at(2026, 1, 8),
        amount: 700,
        description: 'UPI/2/SWIGGY',
        category: 'Eating Out',
      }),
      txn({
        accountingDate: at(2026, 1, 9),
        amount: 900,
        description: 'UPI/3/UBER',
        category: 'Eating Out',
      }),
      txn({
        accountingDate: at(2026, 1, 9),
        amount: 99999,
        type: 'credit',
        description: 'SALARY ACME',
        category: 'Salary',
      }),
    ],
    categories,
    2
  );
  assert.deepStrictEqual(
    merchants.map((m) => [m.label, m.amount, m.count]),
    [
      ['SWIGGY', 1200, 2],
      ['UBER', 900, 1],
    ],
    'income must never appear as a merchant'
  );
}

// --- recurring detection ----------------------------------------------------
{
  const monthly = (day: number, month: number, amount: number) =>
    txn({
      accountingDate: at(2026, month, day),
      amount,
      description: `UPI/${month}${day}/NETFLIX`,
    });

  const found = detectRecurring(
    [
      monthly(4, 1, 649),
      monthly(4, 2, 649),
      monthly(5, 3, 649),
      monthly(4, 4, 649),
      // Steady cadence but wildly varying amount: a habit, not a plan.
      txn({
        accountingDate: at(2026, 1, 2),
        amount: 1200,
        description: 'UPI/10/BIG BAZAAR',
      }),
      txn({
        accountingDate: at(2026, 2, 2),
        amount: 4300,
        description: 'UPI/20/BIG BAZAAR',
      }),
      txn({
        accountingDate: at(2026, 3, 2),
        amount: 800,
        description: 'UPI/30/BIG BAZAAR',
      }),
      // Same amount but several times a week: shopping, not a subscription.
      txn({
        accountingDate: at(2026, 3, 2),
        amount: 60,
        description: 'UPI/40/CHAI POINT',
      }),
      txn({
        accountingDate: at(2026, 3, 4),
        amount: 60,
        description: 'UPI/50/CHAI POINT',
      }),
      txn({
        accountingDate: at(2026, 3, 6),
        amount: 60,
        description: 'UPI/60/CHAI POINT',
      }),
      // Only two payments: not enough to call it recurring.
      txn({
        accountingDate: at(2026, 1, 20),
        amount: 999,
        description: 'UPI/70/ADOBE',
      }),
      txn({
        accountingDate: at(2026, 2, 20),
        amount: 999,
        description: 'UPI/80/ADOBE',
      }),
    ],
    at(2026, 4, 30)
  );

  assert.deepStrictEqual(
    found.map((r) => r.label),
    ['NETFLIX'],
    'only the steady-amount, steady-cadence charge counts'
  );
  assert.strictEqual(found[0].cadence, 'monthly');
  assert.strictEqual(found[0].annual, 649 * 12);
  assert.strictEqual(found[0].stale, false);
}

{
  // A yearly charge, last seen two years ago, is both yearly and stale.
  const yearly = detectRecurring(
    [
      txn({
        accountingDate: at(2022, 6, 1),
        amount: 12000,
        description: 'UPI/240/DOMAIN RENEWAL',
      }),
      txn({
        accountingDate: at(2023, 6, 1),
        amount: 12000,
        description: 'UPI/250/DOMAIN RENEWAL',
      }),
      txn({
        accountingDate: at(2024, 6, 1),
        amount: 12000,
        description: 'UPI/260/DOMAIN RENEWAL',
      }),
    ],
    at(2026, 9, 1)
  );
  assert.strictEqual(yearly.length, 1);
  assert.strictEqual(yearly[0].cadence, 'yearly');
  assert.strictEqual(yearly[0].stale, true);
}

// --- burndown ---------------------------------------------------------------
{
  const now = new Date(2026, 2, 10); // 10 March 2026
  const { points, currentTotal, previousTotal } = burndown(
    [
      txn({
        accountingDate: at(2026, 3, 2),
        amount: 1000,
        category: 'Groceries',
      }),
      txn({
        accountingDate: at(2026, 3, 9),
        amount: 500,
        category: 'Groceries',
      }),
      txn({
        accountingDate: at(2026, 2, 3),
        amount: 4000,
        category: 'Groceries',
      }),
      txn({
        accountingDate: at(2026, 1, 3),
        amount: 9999,
        category: 'Groceries',
      }),
    ],
    categories,
    now
  );

  assert.strictEqual(currentTotal, 1500);
  assert.strictEqual(previousTotal, 4000, 'January must stay out of it');
  assert.strictEqual(points[1].current, 1000, 'cumulative by day 2');
  assert.strictEqual(points[9].current, 1500, 'cumulative by day 10');
  assert.strictEqual(points[10].current, null, 'no line past today');
  assert.strictEqual(
    points[27].previous,
    4000,
    'February runs to its own 28th'
  );
  assert.strictEqual(points[28].previous, null, 'February has no 29th in 2026');
}

// --- month trajectory -------------------------------------------------------
{
  const now = new Date(2026, 1, 10); // 10 Feb 2026
  const flows = monthTrajectory(
    [
      txn({
        accountingDate: at(2026, 2, 1),
        amount: 100000,
        type: 'credit',
        category: 'Salary',
      }),
      txn({
        accountingDate: at(2026, 2, 2),
        amount: 1000,
        category: 'Groceries',
      }),
      txn({
        accountingDate: at(2026, 2, 2),
        amount: 200,
        type: 'credit',
        category: 'Groceries',
      }),
      txn({
        accountingDate: at(2026, 2, 3),
        amount: 5000,
        category: 'Mutual Funds',
      }),
      txn({ accountingDate: at(2026, 2, 3), amount: 1800, category: 'EPF' }),
      txn({
        accountingDate: at(2026, 2, 4),
        amount: 50000,
        category: 'Card Payment',
      }),
      txn({ accountingDate: at(2026, 2, 5), amount: 700 }),
      txn({
        accountingDate: at(2026, 1, 20),
        amount: 9999,
        category: 'Groceries',
      }),
    ],
    categories,
    2026,
    2,
    now
  );

  assert.strictEqual(flows.length, 28, 'February 2026 has 28 days');
  assert.strictEqual(flows[0].income, 100000);
  assert.strictEqual(
    flows[1].expense,
    800,
    'a refund subtracts from the same day'
  );
  assert.strictEqual(flows[2].savings, 5000);
  assert.strictEqual(
    flows[2].passiveSavings,
    1800,
    'passive savings stay apart'
  );
  assert.strictEqual(
    flows[4].expense,
    700,
    'an uncategorised debit still counts as spend'
  );
  assert.strictEqual(
    flows[3].expense,
    0,
    'intra-transfer counts on neither side'
  );
  assert.strictEqual(flows[1].cumExpense, 800, 'January stays out of February');
  assert.strictEqual(
    flows[27].cumSavings,
    6800,
    'the chart still sees one savings line'
  );
  assert.strictEqual(
    flows[27].cumExpense,
    1500,
    'uncategorised rolls into spend'
  );
  assert.strictEqual(flows[27].cumLeft, 100000 - 1500 - 6800);
  assert.strictEqual(flows[9].future, false, 'today is the 10th');
  assert.strictEqual(flows[10].future, true);
}

// --- compact currency -------------------------------------------------------
{
  assert.strictEqual(formatINRCompact(1500), '₹1.5K');
  assert.strictEqual(formatINRCompact(250000), '₹2.5L');
  assert.strictEqual(formatINRCompact(15000000), '₹1.5Cr');
  assert.strictEqual(formatINRCompact(-4200), '-₹4.2K');
  assert.strictEqual(formatINRCompact(0), '₹0');
}

console.log('insights: all checks passed');
