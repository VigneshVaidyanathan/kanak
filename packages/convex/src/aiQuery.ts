import { v } from 'convex/values';
import { query } from './_generated/server.js';
import { requireUser, requireWorkspace } from './lib/auth.js';

/**
 * The tables the AI assistant may read, and the fields it may see of each.
 *
 * This is an allowlist in both directions, and both directions matter:
 *
 *  - Table: Convex Auth's tables (`authAccounts` holds password hashes,
 *    `authSessions` holds live sessions) are simply absent, as is `users`.
 *    A denylist would have to be revisited every time Convex Auth adds a table;
 *    this does not.
 *  - Field: `fields` is also the projection, so a column added to a table later
 *    cannot leak through a query written today.
 *
 * `soft` names the column that marks a row as deleted. Every table here has a
 * `by_workspaceId` index — the scan below relies on it.
 */
const READABLE_TABLES = {
  transactions: {
    soft: 'isDeleted',
    fields: [
      'date',
      'accountingDate',
      'description',
      'amount',
      'type',
      'bankAccount',
      'reason',
      'category',
      'notes',
      'isInternal',
    ],
  },
  categories: {
    fields: [
      'title',
      'color',
      'icon',
      'description',
      'type',
      'priority',
      'active',
    ],
  },
  bank_accounts: {
    fields: ['name', 'bankName', 'branch', 'active'],
  },
  budgets: {
    fields: ['categoryId', 'month', 'year', 'amount', 'actual', 'note'],
  },
  transaction_rules: {
    fields: ['title', 'order'],
  },
  wealth_sections: {
    soft: 'deletedAt',
    fields: ['name', 'color', 'operation', 'order'],
  },
  wealth_line_items: {
    soft: 'deletedAt',
    fields: ['sectionId', 'name', 'order'],
  },
  wealth_entries: {
    fields: ['lineItemId', 'date', 'amount'],
  },
  transaction_uploads: {
    fields: ['fileName', 'fileSize', 'totalRows', 'uploadedAt'],
  },
} as const;

type ReadableTable = keyof typeof READABLE_TABLES;

const OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains'] as const;
type Op = (typeof OPS)[number];

// A bound on what one tool call can pull into the model's context. Anything
// bigger is a question for summarizeSpending, not for this.
const MAX_LIMIT = 200;

function matches(
  row: Record<string, unknown>,
  field: string,
  op: Op,
  value: unknown
) {
  const actual = row[field];

  switch (op) {
    case 'eq':
      return actual === value;
    case 'neq':
      return actual !== value;
    case 'gt':
      return (
        typeof actual === 'number' &&
        typeof value === 'number' &&
        actual > value
      );
    case 'gte':
      return (
        typeof actual === 'number' &&
        typeof value === 'number' &&
        actual >= value
      );
    case 'lt':
      return (
        typeof actual === 'number' &&
        typeof value === 'number' &&
        actual < value
      );
    case 'lte':
      return (
        typeof actual === 'number' &&
        typeof value === 'number' &&
        actual <= value
      );
    case 'contains':
      return (
        typeof actual === 'string' &&
        typeof value === 'string' &&
        actual.toLowerCase().includes(value.toLowerCase())
      );
  }
}

/**
 * A read of one allowlisted table, scoped to the caller's active workspace.
 *
 * This is a `query`, and that is the whole safety story: a Convex QueryCtx has
 * no `db.insert`, `patch`, `replace` or `delete` to call, so no argument the
 * model can produce turns this into a write. Scoping is equally structural —
 * `workspaceId` comes from `requireWorkspace`, and there is no argument to
 * override it.
 */
export const queryTable = query({
  args: {
    table: v.string(),
    filters: v.optional(
      v.array(
        v.object({
          field: v.string(),
          op: v.string(),
          value: v.union(v.string(), v.number(), v.boolean()),
        })
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const spec = READABLE_TABLES[args.table as ReadableTable];
    if (!spec) {
      throw new Error(
        `Unknown table "${args.table}". Readable tables: ${Object.keys(READABLE_TABLES).join(', ')}`
      );
    }

    const allowed = spec.fields as readonly string[];
    const filters = args.filters ?? [];

    for (const filter of filters) {
      if (!allowed.includes(filter.field)) {
        throw new Error(
          `Unknown field "${filter.field}" on ${args.table}. Fields: ${allowed.join(', ')}`
        );
      }
      if (!OPS.includes(filter.op as Op)) {
        throw new Error(
          `Unknown operator "${filter.op}". Operators: ${OPS.join(', ')}`
        );
      }
    }

    const soft = 'soft' in spec ? (spec.soft as string) : undefined;
    const limit = Math.min(Math.max(args.limit ?? 50, 1), MAX_LIMIT);

    const rows = await ctx.db
      .query(args.table as ReadableTable)
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect();

    const live = rows.filter((row) => {
      const deleted = (row as Record<string, unknown>)[soft ?? ''];
      return soft === undefined || deleted === undefined || deleted === false;
    });

    const hits = live.filter((row) =>
      filters.every((f) =>
        matches(row as Record<string, unknown>, f.field, f.op as Op, f.value)
      )
    );

    // The projection is the field allowlist, so a column added to this table
    // later is invisible here until someone adds it above on purpose.
    const project = (row: Record<string, unknown>) => {
      const out: Record<string, unknown> = { id: row._id };
      for (const field of allowed) {
        if (row[field] !== undefined) out[field] = row[field];
      }
      return out;
    };

    return {
      rows: hits
        .slice(0, limit)
        .map((r) => project(r as Record<string, unknown>)),
      totalMatched: hits.length,
      truncated: hits.length > limit,
    };
  },
});

/** The table/field surface, rendered for the model's system prompt. */
export const READABLE_TABLE_SUMMARY = Object.entries(READABLE_TABLES)
  .map(
    ([table, spec]) =>
      `${table}: ${(spec.fields as readonly string[]).join(', ')}`
  )
  .join('\n');
