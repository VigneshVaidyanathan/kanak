import type {
  GroupFilter,
  Transaction,
  TransactionRuleAction,
} from '@kanak/shared';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel.js';
import type { MutationCtx, QueryCtx } from './_generated/server.js';
import { mutation, query } from './_generated/server.js';
import { requireWorkspace } from './lib/auth.js';
import { matchesGroupFilter } from './lib/ruleMatcher.js';

/** Soft-deleted rows are invisible to every read and every write path. */
const isLive = (t: Doc<'transactions'> | null): t is Doc<'transactions'> =>
  t !== null && t.isDeleted !== true;

/** Fields an update may touch, and therefore the fields history records. */
const HISTORY_FIELDS = [
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
  'isDeleted',
] as const;

type HistoryField = (typeof HISTORY_FIELDS)[number];

/**
 * Store the pre-patch values of whatever an update is about to change, so the
 * whole action can be undone later with `revertBatch`. Rows changed by one bulk
 * action share a batchId. A no-op patch records nothing.
 */
async function recordHistory(
  ctx: MutationCtx,
  {
    existing,
    updates,
    batchId,
    source,
  }: {
    existing: Doc<'transactions'>;
    updates: Partial<Record<HistoryField, unknown>>;
    batchId: string;
    source: string;
  }
) {
  const changed = HISTORY_FIELDS.filter(
    (field) => field in updates && updates[field] !== existing[field]
  );
  if (changed.length === 0) return;

  const before: Record<string, unknown> = {};
  for (const field of changed) {
    // An absent key means the field had no value before the patch.
    if (existing[field] !== undefined) before[field] = existing[field];
  }

  await ctx.db.insert('transaction_history', {
    userId: existing.userId,
    workspaceId: existing.workspaceId,
    transactionId: existing._id,
    batchId,
    source,
    before,
    changed,
    createdAt: Date.now(),
  });
}

/** Index range arguments shared by the two windowed reads. */
const accountingDateRange = {
  startAccountingDate: v.number(),
  endAccountingDate: v.number(),
};

/**
 * The workspace's transactions whose accountingDate falls inside the window
 * (inclusive), read straight off the index rather than scanned and filtered.
 * The window is required: an unbounded read of a subscribed query is what made
 * these the most expensive reads in the deployment.
 */
function accountingDateRangeQuery(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  range: { startAccountingDate: number; endAccountingDate: number }
) {
  return ctx.db
    .query('transactions')
    .withIndex('by_workspaceId_accountingDate', (q) =>
      q
        .eq('workspaceId', workspaceId)
        .gte('accountingDate', range.startAccountingDate)
        .lte('accountingDate', range.endAccountingDate)
    )
    .collect();
}

// Matches the shape the deleted API layer used to map: `id`, not `_id`, and
// epoch-millisecond timestamps, since Convex cannot serialize a Date.
export function toTransaction(
  transaction: Omit<Doc<'transactions'>, '_creationTime'>
) {
  return {
    id: transaction._id,
    date: transaction.date,
    accountingDate: transaction.accountingDate,
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type as 'credit' | 'debit',
    bankAccount: transaction.bankAccount,
    reason: transaction.reason,
    category: transaction.category,
    notes: transaction.notes,
    isInternal: transaction.isInternal,
    userId: transaction.userId,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

/**
 * A workspace's transactions in an accounting date window, newest first.
 *
 * This is a subscribed query, so every write to the table re-runs it. Keep the
 * window as narrow as the view needs.
 */
export const getTransactionsByUserId = query({
  args: accountingDateRange,
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const transactions = await accountingDateRangeQuery(ctx, workspaceId, args);

    return transactions
      .filter(isLive)
      .sort((a, b) => b.date - a.date)
      .map(toTransaction);
  },
});

/**
 * Get transactions for a user within an accounting date range (inclusive).
 * Used for budget actuals - filters by accountingDate only, not transaction date.
 */
export const getTransactionsByUserIdAndAccountingDateRange = query({
  args: accountingDateRange,
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const transactions = await accountingDateRangeQuery(ctx, workspaceId, args);

    return transactions
      .filter((t) => isLive(t) && t.isInternal !== true)
      .map(toTransaction);
  },
});

export const getTransactionsByIds = query({
  args: { ids: v.array(v.id('transactions')) },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const transactions = await Promise.all(
      args.ids.map((id) => ctx.db.get(id))
    );

    return transactions
      .filter(
        (t): t is Doc<'transactions'> =>
          isLive(t) && t.workspaceId === workspaceId
      )
      .map(toTransaction);
  },
});

export const createTransaction = mutation({
  args: {
    date: v.number(),
    accountingDate: v.optional(v.number()),
    description: v.string(),
    amount: v.number(),
    type: v.string(),
    bankAccount: v.string(),
    reason: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    isInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    const now = Date.now();

    const inserted = {
      ...args,
      accountingDate: args.accountingDate ?? args.date,
      userId,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    };
    const transactionId = await ctx.db.insert('transactions', inserted);

    // The inserted values are already in hand; reading the row back would be a
    // second read of something we just wrote.
    return toTransaction({ _id: transactionId, ...inserted });
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id('transactions'),
    date: v.optional(v.number()),
    accountingDate: v.optional(v.number()),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    type: v.optional(v.string()),
    bankAccount: v.optional(v.string()),
    reason: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    isInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const { id, ...updates } = args;

    // "Not found" rather than "forbidden" on someone else's row: the response
    // should not confirm that an id exists.
    const existing = await ctx.db.get(id);
    if (!isLive(existing) || existing.workspaceId !== workspaceId) {
      throw new Error('Transaction not found');
    }

    await recordHistory(ctx, {
      existing,
      updates,
      batchId: crypto.randomUUID(),
      source: 'update',
    });
    const patch = { ...updates, updatedAt: Date.now() };
    await ctx.db.patch(id, patch);

    return toTransaction({ ...existing, ...patch });
  },
});

export const deleteTransaction = mutation({
  args: { id: v.id('transactions') },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const existing = await ctx.db.get(args.id);
    if (!isLive(existing) || existing.workspaceId !== workspaceId) {
      throw new Error('Transaction not found');
    }

    await recordHistory(ctx, {
      existing,
      updates: { isDeleted: true },
      batchId: crypto.randomUUID(),
      source: 'delete',
    });
    await ctx.db.patch(args.id, { isDeleted: true, updatedAt: Date.now() });
    return { success: true };
  },
});

export const deleteTransactions = mutation({
  args: { ids: v.array(v.id('transactions')) },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    // Check every id before deleting any, so a request carrying one foreign
    // id cannot delete the rest.
    const existing = await Promise.all(args.ids.map((id) => ctx.db.get(id)));

    const validTransactions = existing.filter(
      (t) => isLive(t) && t.workspaceId === workspaceId
    );

    if (validTransactions.length !== args.ids.length) {
      throw new Error(
        'Some transactions were not found or you do not have permission to delete them'
      );
    }

    const now = Date.now();
    const batchId = crypto.randomUUID();
    for (const transaction of validTransactions as Array<Doc<'transactions'>>) {
      await recordHistory(ctx, {
        existing: transaction,
        updates: { isDeleted: true },
        batchId,
        source: 'delete',
      });
    }
    await Promise.all(
      args.ids.map((id) =>
        ctx.db.patch(id, { isDeleted: true, updatedAt: now })
      )
    );
    return { success: true as const, count: args.ids.length, batchId };
  },
});

const transactionFields = {
  date: v.number(),
  accountingDate: v.optional(v.number()),
  description: v.string(),
  amount: v.number(),
  type: v.string(),
  bankAccount: v.string(),
  reason: v.optional(v.string()),
  category: v.optional(v.string()),
  notes: v.optional(v.string()),
  isInternal: v.optional(v.boolean()),
};

const duplicateKey = (t: {
  date: number;
  amount: number;
  description: string;
  type: string;
}) => `${t.date}|${t.amount}|${t.description}|${t.type}`;

/**
 * Upsert many transactions in a single round trip.
 * Replaces the per-row findDuplicate + create pair used by CSV import.
 */
export const upsertTransactionsBatch = mutation({
  args: { transactions: v.array(v.object(transactionFields)) },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);

    if (args.transactions.length === 0)
      return { created: 0, updated: 0, ids: [] as Id<'transactions'>[] };

    // A duplicate shares its `date` with the input it matches, so every row
    // that could match this chunk lies inside the chunk's own date span. One
    // bounded read replaces a scan of the workspace's whole history.
    const dates = args.transactions.map((t) => t.date);
    const existing = await ctx.db
      .query('transactions')
      .withIndex('by_workspaceId_date', (q) =>
        q
          .eq('workspaceId', workspaceId)
          .gte('date', Math.min(...dates))
          .lte('date', Math.max(...dates))
      )
      .collect();

    // Only the id and accountingDate are needed to dedupe against a row, so
    // the map holds those rather than whole documents.
    const byKey = new Map<
      string,
      { id: Id<'transactions'>; accountingDate: number }
    >(
      existing
        .filter(isLive)
        .map((t) => [
          duplicateKey(t),
          { id: t._id, accountingDate: t.accountingDate },
        ])
    );
    const now = Date.now();
    // Touched rows, in input order, so the importer can apply rules to them.
    const ids: Id<'transactions'>[] = [];
    let created = 0;
    let updated = 0;

    for (const input of args.transactions) {
      const key = duplicateKey(input);
      const match = byKey.get(key);

      if (match) {
        // A patch never changes the duplicate key, so the entry keeps its slot
        // and later rows in the batch still dedupe against it.
        const accountingDate = input.accountingDate ?? match.accountingDate;
        await ctx.db.patch(match.id, {
          ...input,
          accountingDate,
          updatedAt: now,
        });
        byKey.set(key, { id: match.id, accountingDate });
        ids.push(match.id);
        updated++;
        continue;
      }

      const accountingDate = input.accountingDate ?? input.date;
      const id = await ctx.db.insert('transactions', {
        ...input,
        accountingDate,
        userId,
        workspaceId,
        createdAt: now,
        updatedAt: now,
      });
      // Later rows in the same batch dedupe against this one too.
      byKey.set(key, { id, accountingDate });
      ids.push(id);
      created++;
    }

    // Counts plus ids: the caller tallies created vs updated and then applies
    // rules to the rows it just imported. Returning whole documents instead
    // made a 500-row chunk ship 500 rows it drops.
    return { created, updated, ids };
  },
});

/**
 * Patch many transactions in a single round trip.
 * Used when applying transaction rules across a large selection.
 */
export const updateTransactionsBatch = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id('transactions'),
        notes: v.optional(v.string()),
        category: v.optional(v.string()),
        bankAccount: v.optional(v.string()),
        isInternal: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const now = Date.now();
    // One batchId for the whole bulk action, so `revertBatch` can undo it whole.
    const batchId = crypto.randomUUID();
    const updated: Array<Omit<Doc<'transactions'>, '_creationTime'>> = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const { id, ...fields } of args.updates) {
      const existing = await ctx.db.get(id);
      if (!isLive(existing) || existing.workspaceId !== workspaceId) {
        failed.push({ id, error: 'Transaction not found' });
        continue;
      }

      await recordHistory(ctx, {
        existing,
        updates: fields,
        batchId,
        source: 'batch',
      });
      await ctx.db.patch(id, { ...fields, updatedAt: now });
      updated.push({ ...existing, ...fields, updatedAt: now });
    }

    return { batchId, updated: updated.map(toTransaction), failed };
  },
});

/**
 * Soft-delete every live transaction for a user.
 * Set restore to true to bring them all back.
 */
export const setAllTransactionsDeleted = mutation({
  args: { isDeleted: v.boolean() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect();

    const targets = transactions.filter(
      (t) => (t.isDeleted === true) !== args.isDeleted
    );
    const now = Date.now();

    for (const t of targets) {
      await ctx.db.patch(t._id, { isDeleted: args.isDeleted, updatedAt: now });
    }

    return { count: targets.length };
  },
});

/**
 * Apply transaction rules to a set of transactions, or to all of them.
 *
 * Replaces two REST routes that did the same work either side of a rule id:
 * `/api/transactions/apply-rules` (many transactions, every rule, first match
 * wins) and `/api/transaction-rules/[id]/apply` (one rule, every transaction).
 * Both now differ only in their arguments.
 *
 * With `preview`, nothing is written and the counts describe what would be.
 */
export const applyRules = mutation({
  args: {
    transactionIds: v.optional(v.array(v.id('transactions'))),
    ruleId: v.optional(v.id('transaction_rules')),
    preview: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const allRules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect();

    // One rule, or all of them in priority order: lowest `order` first, ties
    // broken by newest.
    const rules = args.ruleId
      ? allRules.filter((rule) => rule._id === args.ruleId)
      : allRules.sort((a, b) =>
          a.order !== b.order ? a.order - b.order : b.createdAt - a.createdAt
        );

    if (rules.length === 0) {
      return {
        updated: 0,
        skipped: args.transactionIds?.length ?? 0,
        ruleBreakdown: {},
      };
    }

    let transactions: Doc<'transactions'>[];
    if (args.transactionIds) {
      const fetched = await Promise.all(
        args.transactionIds.map((id) => ctx.db.get(id))
      );
      transactions = fetched.filter(
        (t): t is Doc<'transactions'> =>
          isLive(t) && t.workspaceId === workspaceId
      );
    } else {
      const all = await ctx.db
        .query('transactions')
        .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
        .collect();
      transactions = all.filter(isLive);
    }

    const now = Date.now();
    const ruleBreakdown: Record<
      string,
      { ruleTitle: string; count: number; transactionIds: string[] }
    > = {};
    let updated = 0;
    let skipped = 0;

    for (const transaction of transactions) {
      // First matching rule wins; later rules never see this transaction.
      const rule = rules.find((r) =>
        matchesGroupFilter(
          toTransaction(transaction) as unknown as Transaction,
          r.filter as GroupFilter
        )
      );

      if (!rule) {
        skipped++;
        continue;
      }

      const breakdown = (ruleBreakdown[rule._id] ??= {
        ruleTitle: rule.title,
        count: 0,
        transactionIds: [],
      });
      breakdown.count++;
      // ponytail: ids only; the preview UI already holds the rows it selected.
      if (args.preview) breakdown.transactionIds.push(transaction._id);
      updated++;

      if (args.preview) {
        continue;
      }

      const action = rule.action as TransactionRuleAction;
      const patch: Partial<Doc<'transactions'>> = { updatedAt: now };
      if (action.notes) patch.notes = action.notes;
      if (action.category) patch.category = action.category;
      if (action.isInternal !== undefined) {
        patch.isInternal = action.isInternal === 'yes';
      }

      await ctx.db.patch(transaction._id, patch);
    }

    return { updated, skipped, ruleBreakdown };
  },
});

/**
 * The most recent change batches for a user, newest first. One row per bulk
 * action, with the number of transactions it touched.
 */
export const getRecentHistoryBatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    // ponytail: scans the workspace's history; add a batches table if it grows
    // past a few thousand rows.
    const rows = await ctx.db
      .query('transaction_history')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .order('desc')
      .take(5000);

    const batches = new Map<
      string,
      {
        batchId: string;
        source: string;
        createdAt: number;
        count: number;
        fields: string[];
      }
    >();
    for (const row of rows) {
      const batch = batches.get(row.batchId);
      if (batch) {
        batch.count += 1;
        for (const field of row.changed) {
          if (!batch.fields.includes(field)) batch.fields.push(field);
        }
      } else {
        batches.set(row.batchId, {
          batchId: row.batchId,
          source: row.source,
          createdAt: row.createdAt,
          count: 1,
          fields: [...row.changed],
        });
      }
    }

    return [...batches.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 20);
  },
});

/**
 * Undo one change batch: put every field the batch changed back to the value it
 * held before, clearing fields that had no value. The history rows are consumed,
 * so a batch can only be reverted once.
 */
export const revertBatch = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const rows = await ctx.db
      .query('transaction_history')
      .withIndex('by_batchId', (q) => q.eq('batchId', args.batchId))
      .collect();

    if (rows.length === 0) {
      throw new Error('Nothing to revert: unknown or already reverted batch');
    }
    if (rows.some((row) => row.workspaceId !== workspaceId)) {
      throw new Error('Nothing to revert: unknown or already reverted batch');
    }

    const now = Date.now();
    let reverted = 0;
    for (const row of rows) {
      const transaction = await ctx.db.get(row.transactionId);
      if (transaction && transaction.workspaceId === workspaceId) {
        const restore: Record<string, unknown> = { updatedAt: now };
        for (const field of row.changed) {
          // A field missing from `before` had no value, and patching undefined
          // removes it again.
          restore[field] = (row.before as Record<string, unknown>)[field];
        }
        await ctx.db.patch(row.transactionId, restore);
        reverted += 1;
      }
      await ctx.db.delete(row._id);
    }

    return { reverted };
  },
});
