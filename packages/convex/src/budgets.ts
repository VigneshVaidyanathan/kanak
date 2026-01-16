import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';

export const getBudgetsByUserId = query({
  args: {
    userId: v.id('users'),
    year: v.optional(v.number()),
    month: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let budgets = await ctx.db
      .query('budgets')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    if (args.year !== undefined) {
      budgets = budgets.filter((b) => b.year === args.year);
    }
    if (args.month !== undefined) {
      budgets = budgets.filter((b) => b.month === args.month);
    }

    // Sort by year desc, month desc, categoryId asc
    return budgets.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return a.categoryId.localeCompare(b.categoryId);
    });
  },
});

export const getBudgetByCategory = query({
  args: {
    userId: v.id('users'),
    categoryId: v.string(),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const budgets = await ctx.db
      .query('budgets')
      .withIndex('by_userId_categoryId_year_month', (q) =>
        q
          .eq('userId', args.userId)
          .eq('categoryId', args.categoryId)
          .eq('year', args.year)
          .eq('month', args.month)
      )
      .collect();

    return budgets[0] || null;
  },
});

export const createOrUpdateBudget = mutation({
  args: {
    userId: v.id('users'),
    categoryId: v.string(),
    month: v.number(),
    year: v.number(),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if budget exists
    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_userId_categoryId_year_month', (q) =>
        q
          .eq('userId', args.userId)
          .eq('categoryId', args.categoryId)
          .eq('year', args.year)
          .eq('month', args.month)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount: args.amount,
        note: args.note,
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    } else {
      const budgetId = await ctx.db.insert('budgets', {
        userId: args.userId,
        categoryId: args.categoryId,
        month: args.month,
        year: args.year,
        amount: args.amount,
        note: args.note,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(budgetId);
    }
  },
});

export const deleteBudget = mutation({
  args: {
    id: v.id('budgets'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error('Budget not found');
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const getBudgetsByUserIdYearMonth = query({
  args: {
    userId: v.id('users'),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const budgets = await ctx.db
      .query('budgets')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    return budgets.filter(
      (b) => b.year === args.year && b.month === args.month
    );
  },
});

export const updateBudgetActual = mutation({
  args: {
    userId: v.id('users'),
    categoryId: v.string(),
    year: v.number(),
    month: v.number(),
    actual: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_userId_categoryId_year_month', (q) =>
        q
          .eq('userId', args.userId)
          .eq('categoryId', args.categoryId)
          .eq('year', args.year)
          .eq('month', args.month)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        actual: args.actual,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    } else {
      // Create budget with actual if it doesn't exist
      const now = Date.now();
      const budgetId = await ctx.db.insert('budgets', {
        userId: args.userId,
        categoryId: args.categoryId,
        month: args.month,
        year: args.year,
        amount: 0,
        actual: args.actual,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(budgetId);
    }
  },
});
