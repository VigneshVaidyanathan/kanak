import type { FunctionReference } from 'convex/server';
import { api } from '../_generated/api.js';
import type { ActionCtx } from '../_generated/server.js';

/**
 * Every Convex function the AI assistant is allowed to reach.
 *
 * The `satisfies` clause is the lock, not a formality: a mutation or action
 * reference added here is a compile error, and `ctx.runQuery` refuses one at
 * runtime too. Nothing in the assistant's path resolves a function any other
 * way, so this object is the complete list of what it can do to the database.
 */
export const AI_QUERIES = {
  transactions: api.transactions.getTransactionsByUserId,
  categories: api.categories.getCategoriesByUserId,
  bankAccounts: api.bankAccounts.getBankAccountsByUserId,
  budgets: api.budgets.getBudgetsByUserId,
  budgetHistory: api.budgets.getBudgetHistory,
  wealthSections: api.wealth.getWealthSectionsByUserId,
  wealthEntries: api.wealth.getWealthEntriesByDateRange,
  rules: api.transactionRules.getTransactionRulesByUserId,
  table: api.aiQuery.queryTable,
} as const satisfies Record<string, FunctionReference<'query'>>;

/** Widest window one call may ask for. Two years of rows is already a lot. */
const MAX_WINDOW_DAYS = 730;
const DAY_MS = 86_400_000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A `YYYY-MM-DD` date as epoch milliseconds, in the *user's* timezone.
 *
 * The app writes accounting dates from the browser, so a day boundary here has
 * to be the browser's midnight, not the server's. `tzOffsetMinutes` is
 * `Date.prototype.getTimezoneOffset()` from the client — minutes to add to
 * local time to get UTC, so -330 for IST.
 */
function toEpoch(date: string, tzOffsetMinutes: number, endOfDay = false) {
  if (!DATE_RE.test(date)) {
    throw new Error(`Date must be YYYY-MM-DD, got "${date}"`);
  }
  const [y, m, d] = date.split('-').map(Number);
  const localMidnight = Date.UTC(y, m - 1, d);
  const base = localMidnight + tzOffsetMinutes * 60_000;
  return endOfDay ? base + DAY_MS - 1 : base;
}

function window(args: { startDate: string; endDate: string }, tz: number) {
  const startAccountingDate = toEpoch(args.startDate, tz);
  const endAccountingDate = toEpoch(args.endDate, tz, true);

  if (endAccountingDate < startAccountingDate) {
    throw new Error('endDate is before startDate');
  }
  if (endAccountingDate - startAccountingDate > MAX_WINDOW_DAYS * DAY_MS) {
    throw new Error(
      `Window is wider than ${MAX_WINDOW_DAYS} days. Ask for a narrower range, or use summarizeSpending.`
    );
  }

  return { startAccountingDate, endAccountingDate };
}

type Txn = {
  date: number;
  accountingDate: number;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  bankAccount: string;
  category?: string;
  reason?: string;
  notes?: string;
  isInternal?: boolean;
};

/**
 * Transactions in a window.
 *
 * Deliberately `getTransactionsByUserId` and not the ...AndAccountingDateRange
 * twin: that one hard-filters `isInternal !== true`, which would make
 * `includeInternal` impossible to honour.
 */
async function transactionsIn(
  ctx: ActionCtx,
  args: { startDate: string; endDate: string; includeInternal?: boolean },
  tz: number
): Promise<Txn[]> {
  const rows = (await ctx.runQuery(
    AI_QUERIES.transactions,
    window(args, tz)
  )) as Txn[];

  return args.includeInternal
    ? rows
    : rows.filter((t) => t.isInternal !== true);
}

const monthKey = (ms: number) => new Date(ms).toISOString().slice(0, 7);

// ---------------------------------------------------------------------------
// Tool specs, in OpenAI function-calling format. Hand-written JSON Schema
// rather than generated from zod: nine small objects do not justify a
// schema-conversion dependency inside the Convex bundle.
// ---------------------------------------------------------------------------

const dateRangeProps = {
  startDate: { type: 'string', description: 'Inclusive start, YYYY-MM-DD' },
  endDate: { type: 'string', description: 'Inclusive end, YYYY-MM-DD' },
};

export const TOOL_SPECS = [
  {
    name: 'listCategories',
    description:
      "All of the user's categories with their type and priority. Call this before filtering transactions or budgets by category — both store the category TITLE, so the spelling has to match exactly.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'listBankAccounts',
    description: "The user's bank accounts.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'getTransactions',
    description:
      'Individual transactions in an accounting-date window, newest first. Use this when the user asks about specific transactions. For totals, use summarizeSpending instead — it does not flood the answer with rows.',
    parameters: {
      type: 'object',
      properties: {
        ...dateRangeProps,
        category: { type: 'string', description: 'Exact category title' },
        type: { type: 'string', enum: ['credit', 'debit'] },
        minAmount: { type: 'number' },
        maxAmount: { type: 'number' },
        search: {
          type: 'string',
          description: 'Case-insensitive substring of the description',
        },
        includeInternal: {
          type: 'boolean',
          description:
            "Include internal transfers between the user's own accounts. Default false.",
        },
        limit: { type: 'number', description: '1-200, default 50' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'summarizeSpending',
    description:
      'Totals and counts over an accounting-date window, grouped. This is the right tool for "how much did I spend on X" — it aggregates server-side instead of returning every row.',
    parameters: {
      type: 'object',
      properties: {
        ...dateRangeProps,
        groupBy: {
          type: 'string',
          enum: ['category', 'month', 'bankAccount', 'type'],
        },
        includeInternal: { type: 'boolean' },
      },
      required: ['startDate', 'endDate', 'groupBy'],
    },
  },
  {
    name: 'getBudgets',
    description:
      'Budgeted amounts vs actuals for a year, optionally one month. `categoryId` on a budget is a category TITLE.',
    parameters: {
      type: 'object',
      properties: {
        year: { type: 'number' },
        month: { type: 'number', description: '1-12; omit for the whole year' },
      },
      required: ['year'],
    },
  },
  {
    name: 'getBudgetHistory',
    description:
      "One category's budget over the preceding months, newest first.",
    parameters: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'The category TITLE' },
        year: { type: 'number' },
        month: { type: 'number' },
        months: { type: 'number', description: 'How many months back, 1-36' },
      },
      required: ['categoryId', 'year', 'month'],
    },
  },
  {
    name: 'getNetWorth',
    description:
      'Net worth over a date window, from the wealth tracker. Sections marked "subtract" (liabilities) are subtracted from the total.',
    parameters: {
      type: 'object',
      properties: dateRangeProps,
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'listTransactionRules',
    description: "The user's automatic categorisation rules.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'queryTable',
    description:
      'Escape hatch: read any readable table directly with simple field filters. Use a purpose-built tool above when one fits — this one has no aggregation and returns at most 200 rows.',
    parameters: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          enum: [
            'transactions',
            'categories',
            'bank_accounts',
            'budgets',
            'transaction_rules',
            'wealth_sections',
            'wealth_line_items',
            'wealth_entries',
            'transaction_uploads',
          ],
        },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              op: {
                type: 'string',
                enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'],
              },
              value: {},
            },
            required: ['field', 'op', 'value'],
          },
        },
        limit: { type: 'number', description: '1-200, default 50' },
      },
      required: ['table'],
    },
  },
] as const;

export const TOOL_NAMES = TOOL_SPECS.map((t) => t.name);

// ---------------------------------------------------------------------------

/**
 * Run one tool call.
 *
 * Every branch ends in `ctx.runQuery`. `ctx` is an ActionCtx, which does carry
 * `runMutation` and `scheduler` — this file never reaches for either, and
 * `scripts/check-ai-readonly.ts` fails the build if it starts to.
 */
export async function runTool(
  ctx: ActionCtx,
  name: string,
  args: Record<string, any>,
  tzOffsetMinutes: number
): Promise<unknown> {
  const tz = tzOffsetMinutes;

  switch (name) {
    case 'listCategories': {
      const rows = (await ctx.runQuery(AI_QUERIES.categories, {})) as any[];
      return rows.map((c) => ({
        title: c.title,
        type: c.type,
        priority: c.priority,
      }));
    }

    case 'listBankAccounts': {
      const rows = (await ctx.runQuery(AI_QUERIES.bankAccounts, {})) as any[];
      return rows.map((b) => ({ name: b.name, bankName: b.bankName }));
    }

    case 'getTransactions': {
      const rows = await transactionsIn(ctx, args as any, tz);
      const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

      const hits = rows.filter((t) => {
        if (args.category && t.category !== args.category) return false;
        if (args.type && t.type !== args.type) return false;
        if (typeof args.minAmount === 'number' && t.amount < args.minAmount)
          return false;
        if (typeof args.maxAmount === 'number' && t.amount > args.maxAmount)
          return false;
        if (
          args.search &&
          !t.description
            .toLowerCase()
            .includes(String(args.search).toLowerCase())
        ) {
          return false;
        }
        return true;
      });

      return {
        rows: hits.slice(0, limit).map((t) => ({
          date: new Date(t.accountingDate).toISOString().slice(0, 10),
          description: t.description,
          amount: t.amount,
          type: t.type,
          category: t.category,
          bankAccount: t.bankAccount,
        })),
        totalMatched: hits.length,
        truncated: hits.length > limit,
      };
    }

    case 'summarizeSpending': {
      const rows = await transactionsIn(ctx, args as any, tz);
      const groupBy = args.groupBy as
        | 'category'
        | 'month'
        | 'bankAccount'
        | 'type';

      const keyOf = (t: Txn) =>
        groupBy === 'category'
          ? (t.category ?? 'Uncategorised')
          : groupBy === 'month'
            ? monthKey(t.accountingDate)
            : groupBy === 'bankAccount'
              ? t.bankAccount
              : t.type;

      const totals = new Map<
        string,
        { debit: number; credit: number; count: number }
      >();
      for (const t of rows) {
        const key = keyOf(t);
        const acc = totals.get(key) ?? { debit: 0, credit: 0, count: 0 };
        acc[t.type] += t.amount;
        acc.count += 1;
        totals.set(key, acc);
      }

      const groups = [...totals.entries()]
        .map(([key, v]) => ({ key, ...v, net: v.credit - v.debit }))
        .sort((a, b) => b.debit - a.debit);

      return {
        groupBy,
        groups,
        totalDebit: groups.reduce((s, g) => s + g.debit, 0),
        totalCredit: groups.reduce((s, g) => s + g.credit, 0),
        transactionCount: rows.length,
      };
    }

    case 'getBudgets':
      return await ctx.runQuery(AI_QUERIES.budgets, {
        year: args.year,
        ...(args.month === undefined ? {} : { month: args.month }),
      });

    case 'getBudgetHistory':
      return await ctx.runQuery(AI_QUERIES.budgetHistory, {
        categoryId: args.categoryId,
        year: args.year,
        month: args.month,
        months: Math.min(Math.max(args.months ?? 12, 1), 36),
      });

    case 'getNetWorth': {
      const range = window(args as any, tz);
      const [sections, entries] = await Promise.all([
        ctx.runQuery(AI_QUERIES.wealthSections, {}) as Promise<any[]>,
        ctx.runQuery(AI_QUERIES.wealthEntries, {
          startDate: range.startAccountingDate,
          endDate: range.endAccountingDate,
        }) as Promise<any[]>,
      ]);

      // lineItemId -> whether its section adds to or subtracts from net worth.
      const sign = new Map<string, number>();
      for (const section of sections) {
        for (const item of section.lineItems ?? []) {
          sign.set(item.id, section.operation === 'subtract' ? -1 : 1);
        }
      }

      const byDate = new Map<string, number>();
      for (const entry of entries) {
        const day = new Date(entry.date).toISOString().slice(0, 10);
        const delta = entry.amount * (sign.get(entry.lineItemId) ?? 1);
        byDate.set(day, (byDate.get(day) ?? 0) + delta);
      }

      return {
        series: [...byDate.entries()]
          .map(([date, netWorth]) => ({ date, netWorth }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
    }

    case 'listTransactionRules': {
      const rows = (await ctx.runQuery(AI_QUERIES.rules, {})) as any[];
      return rows.map((r) => ({ title: r.title, order: r.order }));
    }

    case 'queryTable':
      return await ctx.runQuery(AI_QUERIES.table, {
        table: args.table,
        filters: args.filters,
        limit: args.limit,
      });

    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}
