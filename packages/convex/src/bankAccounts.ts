import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';

export const getBankAccountsByUserId = query({
  args: {
    userId: v.id('users'),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('bank_accounts')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId));

    const bankAccounts = await query.collect();

    let filtered = bankAccounts;
    if (args.activeOnly !== false) {
      filtered = bankAccounts.filter((ba) => ba.active);
    }

    // Sort by name ascending
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getBankAccountById = query({
  args: {
    id: v.id('bank_accounts'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const bankAccount = await ctx.db.get(args.id);
    if (!bankAccount || bankAccount.userId !== args.userId) {
      return null;
    }
    return bankAccount;
  },
});

export const createBankAccount = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    bankName: v.string(),
    accountNumber: v.optional(v.string()),
    ifscCode: v.optional(v.string()),
    branch: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const bankAccountId = await ctx.db.insert('bank_accounts', {
      name: args.name,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      ifscCode: args.ifscCode,
      branch: args.branch,
      active: args.active ?? true,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(bankAccountId);
  },
});

export const updateBankAccount = mutation({
  args: {
    id: v.id('bank_accounts'),
    userId: v.id('users'),
    name: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    ifscCode: v.optional(v.string()),
    branch: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;

    // Verify ownership
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Bank account not found');
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const deactivateBankAccount = mutation({
  args: {
    id: v.id('bank_accounts'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error('Bank account not found');
    }

    await ctx.db.patch(args.id, {
      active: false,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});
