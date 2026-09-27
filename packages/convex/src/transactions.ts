import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';

/** Soft-deleted rows are invisible to every read and every write path. */
const isLive = (t: Doc<'transactions'> | null): t is Doc<'transactions'> =>
  t !== null && t.isDeleted !== true;

export const getTransactionsByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    // Sort by date descending
    return transactions.filter(isLive).sort((a, b) => b.date - a.date);
  },
});

/**
 * Get transactions for a user within an accounting date range (inclusive).
 * Used for budget actuals - filters by accountingDate only, not transaction date.
 */
export const getTransactionsByUserIdAndAccountingDateRange = query({
  args: {
    userId: v.id('users'),
    startAccountingDate: v.number(),
    endAccountingDate: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    return transactions.filter((t) => {
      if (!isLive(t)) return false;
      if (t.isInternal === true) return false;
      const accountingDate = t.accountingDate;
      return (
        accountingDate >= args.startAccountingDate &&
        accountingDate <= args.endAccountingDate
      );
    });
  },
});

export const getTransactionsByIds = query({
  args: {
    ids: v.array(v.id('transactions')),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const transactions = await Promise.all(
      args.ids.map((id) => ctx.db.get(id))
    );
    return transactions.filter(
      (t) => isLive(t) && t.userId === args.userId
    ) as typeof transactions;
  },
});

export const createTransaction = mutation({
  args: {
    userId: v.id('users'),
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
    const now = Date.now();
    const transactionId = await ctx.db.insert('transactions', {
      date: args.date,
      accountingDate: args.accountingDate ?? args.date,
      description: args.description,
      amount: args.amount,
      type: args.type,
      bankAccount: args.bankAccount,
      reason: args.reason,
      category: args.category,
      notes: args.notes,
      isInternal: args.isInternal,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(transactionId);
  },
});

export const findDuplicateTransaction = query({
  args: {
    userId: v.id('users'),
    date: v.number(),
    amount: v.number(),
    description: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    return (
      transactions.find(
        (t) =>
          isLive(t) &&
          t.date === args.date &&
          t.amount === args.amount &&
          t.description === args.description &&
          t.type === args.type
      ) || null
    );
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id('transactions'),
    userId: v.id('users'),
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
    const { id, userId, ...updates } = args;

    // Verify ownership
    const existing = await ctx.db.get(id);
    if (!isLive(existing) || existing.userId !== userId) {
      throw new Error('Transaction not found');
    }

    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Only update accountingDate if provided
    if (args.accountingDate !== undefined) {
      updateData.accountingDate = args.accountingDate;
    }

    await ctx.db.patch(id, updateData);
    return await ctx.db.get(id);
  },
});

export const deleteTransaction = mutation({
  args: {
    id: v.id('transactions'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!isLive(existing) || existing.userId !== args.userId) {
      throw new Error('Transaction not found');
    }

    await ctx.db.patch(args.id, { isDeleted: true, updatedAt: Date.now() });
    return { success: true };
  },
});

export const deleteTransactions = mutation({
  args: {
    ids: v.array(v.id('transactions')),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership of all transactions
    const existing = await Promise.all(args.ids.map((id) => ctx.db.get(id)));

    const validTransactions = existing.filter(
      (t) => isLive(t) && t.userId === args.userId
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
  args: {
    userId: v.id('users'),
    transactions: v.array(v.object(transactionFields)),
  },
  handler: async (ctx, args) => {
    // ponytail: one full scan per call instead of one per row. Batch in
    // chunks on the caller side; switch to a by_userId_date index lookup if
    // a single user's transaction count outgrows the read limit.
    const existing = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
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
        userId: args.userId,
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
    userId: v.id('users'),
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
    const now = Date.now();
    const updated: Array<Doc<'transactions'>> = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const { id, ...fields } of args.updates) {
      const existing = await ctx.db.get(id);
      if (!isLive(existing) || existing.userId !== args.userId) {
        failed.push({ id, error: 'Transaction not found' });
        continue;
      }

      await ctx.db.patch(id, { ...fields, updatedAt: now });
      updated.push((await ctx.db.get(id))!);
    }

    return { updated, failed };
  },
});

/**
 * Soft-delete every live transaction for a user.
 * Set restore to true to bring them all back.
 */
export const setAllTransactionsDeleted = mutation({
  args: {
    userId: v.id('users'),
    isDeleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
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
