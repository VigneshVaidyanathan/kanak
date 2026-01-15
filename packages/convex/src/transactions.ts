import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getTransactionsByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    // Sort by date descending
    return transactions.sort((a, b) => b.date - a.date);
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
      (t) => t !== null && t.userId === args.userId
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
    if (!existing || existing.userId !== userId) {
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
    if (!existing || existing.userId !== args.userId) {
      throw new Error('Transaction not found');
    }

    await ctx.db.delete(args.id);
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
      (t) => t !== null && t.userId === args.userId
    );

    if (validTransactions.length !== args.ids.length) {
      throw new Error(
        'Some transactions were not found or you do not have permission to delete them'
      );
    }

    await Promise.all(args.ids.map((id) => ctx.db.delete(id)));
    return { success: true };
  },
});
