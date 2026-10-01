import { v } from 'convex/values';
import { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { requireWorkspace } from './lib/auth.js';

// The client used to receive this shape from the API layer, which mapped
// `_id` to `id`. Doing it here keeps that contract now that there is no layer
// in between. Timestamps stay numbers: Convex cannot serialize a Date.
function toBankAccount(bankAccount: Doc<'bank_accounts'>) {
  return {
    id: bankAccount._id,
    name: bankAccount.name,
    bankName: bankAccount.bankName,
    accountNumber: bankAccount.accountNumber,
    ifscCode: bankAccount.ifscCode,
    branch: bankAccount.branch,
    active: bankAccount.active,
    userId: bankAccount.userId,
    createdAt: bankAccount.createdAt,
    updatedAt: bankAccount.updatedAt,
  };
}

export const getBankAccountsByUserId = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const bankAccounts = await ctx.db
      .query('bank_accounts')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect();

    return bankAccounts
      .filter((ba) => args.activeOnly === false || ba.active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toBankAccount);
  },
});

export const getBankAccountById = query({
  args: { id: v.id('bank_accounts') },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const bankAccount = await ctx.db.get(args.id);
    if (!bankAccount || bankAccount.workspaceId !== workspaceId) {
      return null;
    }

    return toBankAccount(bankAccount);
  },
});

export const createBankAccount = mutation({
  args: {
    name: v.string(),
    bankName: v.string(),
    accountNumber: v.optional(v.string()),
    ifscCode: v.optional(v.string()),
    branch: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    const now = Date.now();

    const bankAccountId = await ctx.db.insert('bank_accounts', {
      ...args,
      active: args.active ?? true,
      userId,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    });

    return toBankAccount((await ctx.db.get(bankAccountId))!);
  },
});

export const updateBankAccount = mutation({
  args: {
    id: v.id('bank_accounts'),
    name: v.optional(v.string()),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    ifscCode: v.optional(v.string()),
    branch: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const { id, ...updates } = args;

    // "Not found" rather than "forbidden" on someone else's row: the response
    // should not confirm that an id exists.
    const existing = await ctx.db.get(id);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('Bank account not found');
    }

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });

    return toBankAccount((await ctx.db.get(id))!);
  },
});

export const deactivateBankAccount = mutation({
  args: { id: v.id('bank_accounts') },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('Bank account not found');
    }

    await ctx.db.patch(args.id, { active: false, updatedAt: Date.now() });

    return toBankAccount((await ctx.db.get(args.id))!);
  },
});
