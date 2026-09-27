import type {
  GroupFilter,
  Transaction,
  TransactionRuleAction,
} from '@kanak/shared';
import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { requireUser } from './lib/auth.js';
import { matchesGroupFilter } from './lib/ruleMatcher.js';

/** Soft-deleted rows are invisible to every read and every write path. */
const isLive = (t: Doc<'transactions'> | null): t is Doc<'transactions'> =>
  t !== null && t.isDeleted !== true;

// Matches the shape the deleted API layer used to map: `id`, not `_id`, and
// epoch-millisecond timestamps, since Convex cannot serialize a Date.
export function toTransaction(transaction: Doc<'transactions'>) {
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

export const getTransactionsByUserId = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

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
  args: {
    startAccountingDate: v.number(),
    endAccountingDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return transactions
      .filter(
        (t) =>
          isLive(t) &&
          t.isInternal !== true &&
          t.accountingDate >= args.startAccountingDate &&
          t.accountingDate <= args.endAccountingDate
      )
      .map(toTransaction);
  },
});

export const getTransactionsByIds = query({
  args: { ids: v.array(v.id('transactions')) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const transactions = await Promise.all(
      args.ids.map((id) => ctx.db.get(id))
    );

    return transactions
      .filter((t): t is Doc<'transactions'> => isLive(t) && t.userId === userId)
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
    const userId = await requireUser(ctx);
    const now = Date.now();

    const transactionId = await ctx.db.insert('transactions', {
      ...args,
      accountingDate: args.accountingDate ?? args.date,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return toTransaction((await ctx.db.get(transactionId))!);
  },
});

export const findDuplicateTransaction = query({
  args: {
    date: v.number(),
    amount: v.number(),
    description: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const match = transactions.find(
      (t) =>
        isLive(t) &&
        t.date === args.date &&
        t.amount === args.amount &&
        t.description === args.description &&
        t.type === args.type
    );

    return match ? toTransaction(match) : null;
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
    const userId = await requireUser(ctx);
    const { id, ...updates } = args;

    // "Not found" rather than "forbidden" on someone else's row: the response
    // should not confirm that an id exists.
    const existing = await ctx.db.get(id);
    if (!isLive(existing) || existing.userId !== userId) {
      throw new Error('Transaction not found');
    }

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });

    return toTransaction((await ctx.db.get(id))!);
  },
});

export const deleteTransaction = mutation({
  args: { id: v.id('transactions') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!isLive(existing) || existing.userId !== userId) {
      throw new Error('Transaction not found');
    }

    await ctx.db.patch(args.id, { isDeleted: true, updatedAt: Date.now() });
    return { success: true };
  },
});

export const deleteTransactions = mutation({
  args: { ids: v.array(v.id('transactions')) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Check every id before deleting any, so a request carrying one foreign
    // id cannot delete the rest.
    const existing = await Promise.all(args.ids.map((id) => ctx.db.get(id)));

    const validTransactions = existing.filter(
      (t) => isLive(t) && t.userId === userId
    );

    if (validTransactions.length !== args.ids.length) {
      throw new Error(
        'Some transactions were not found or you do not have permission to delete them'
      );
    }

    const now = Date.now();
    await Promise.all(
      args.ids.map((id) =>
        ctx.db.patch(id, { isDeleted: true, updatedAt: now })
      )
    );
    return { success: true as const, count: args.ids.length };
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
    const userId = await requireUser(ctx);

    // ponytail: one full scan per call instead of one per row. Batch in
    // chunks on the caller side; switch to a by_userId_date index lookup if
    // a single user's transaction count outgrows the read limit.
    const existing = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const byKey = new Map(
      existing.filter(isLive).map((t) => [duplicateKey(t), t])
    );
    const now = Date.now();
    const results: Array<{
      action: 'created' | 'updated';
      transaction: Doc<'transactions'>;
    }> = [];

    for (const input of args.transactions) {
      const match = byKey.get(duplicateKey(input));

      if (match) {
        await ctx.db.patch(match._id, {
          ...input,
          accountingDate: input.accountingDate ?? match.accountingDate,
          updatedAt: now,
        });
        const updated = (await ctx.db.get(match._id))!;
        byKey.set(duplicateKey(updated), updated);
        results.push({ action: 'updated', transaction: updated });
        continue;
      }

      const id = await ctx.db.insert('transactions', {
        ...input,
        accountingDate: input.accountingDate ?? input.date,
        userId,
        createdAt: now,
        updatedAt: now,
      });
      const created = (await ctx.db.get(id))!;
      // Later rows in the same batch dedupe against this one too.
      byKey.set(duplicateKey(created), created);
      results.push({ action: 'created', transaction: created });
    }

    return results;
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
        isInternal: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();
    const updated: Array<Doc<'transactions'>> = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const { id, ...fields } of args.updates) {
      const existing = await ctx.db.get(id);
      if (!isLive(existing) || existing.userId !== userId) {
        failed.push({ id, error: 'Transaction not found' });
        continue;
      }

      await ctx.db.patch(id, { ...fields, updatedAt: now });
      updated.push((await ctx.db.get(id))!);
    }

    return { updated: updated.map(toTransaction), failed };
  },
});

/**
 * Soft-delete every live transaction for a user.
 * Set restore to true to bring them all back.
 */
export const setAllTransactionsDeleted = mutation({
  args: { isDeleted: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
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
    const userId = await requireUser(ctx);

    const allRules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
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
        (t): t is Doc<'transactions'> => isLive(t) && t.userId === userId
      );
    } else {
      const all = await ctx.db
        .query('transactions')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect();
      transactions = all.filter(isLive);
    }

    const now = Date.now();
    const ruleBreakdown: Record<string, { ruleTitle: string; count: number }> =
      {};
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
      });
      breakdown.count++;
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
