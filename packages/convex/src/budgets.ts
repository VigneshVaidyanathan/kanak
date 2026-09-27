import { v } from 'convex/values';
import { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { requireUser } from './lib/auth.js';

// Matches the shape the deleted API layer used to map: `id`, not `_id`, and
// epoch-millisecond timestamps, since Convex cannot serialize a Date.
function toBudget(budget: Doc<'budgets'>) {
  return {
    id: budget._id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    month: budget.month,
    year: budget.year,
    amount: budget.amount,
    actual: budget.actual,
    note: budget.note,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

export const getBudgetsByUserId = query({
  args: {
    year: v.optional(v.number()),
    month: v.optional(v.number()),
    categoryId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const budgets = await ctx.db
      .query('budgets')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return budgets
      .filter(
        (b) =>
          (args.year === undefined || b.year === args.year) &&
          (args.month === undefined || b.month === args.month) &&
          (args.categoryId === undefined || b.categoryId === args.categoryId)
      )
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return a.categoryId.localeCompare(b.categoryId);
      })
      .map(toBudget);
  },
});

/**
 * One category's budgets for the N months before (year, month).
 *
 * The route this replaces issued one query per month in a loop; the whole
 * history is one read here.
 */
export const getBudgetHistory = query({
  args: {
    categoryId: v.string(),
    year: v.number(),
    month: v.number(),
    months: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const wanted = new Set<string>();
    for (let i = 1; i <= args.months; i++) {
      let targetYear = args.year;
      let targetMonth = args.month - i;
      while (targetMonth < 1) {
        targetMonth += 12;
        targetYear -= 1;
      }
      wanted.add(`${targetYear}-${targetMonth}`);
    }

    const budgets = await ctx.db
      .query('budgets')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return (
      budgets
        .filter(
          (b) =>
            b.categoryId === args.categoryId &&
            wanted.has(`${b.year}-${b.month}`)
        )
        // Most recent first: callers read [0] as "previous month".
        .sort((a, b) =>
          a.year !== b.year ? b.year - a.year : b.month - a.month
        )
        .map(toBudget)
    );
  },
});

export const getBudgetByCategory = query({
  args: {
    categoryId: v.string(),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const budget = await ctx.db
      .query('budgets')
      .withIndex('by_userId_categoryId_year_month', (q) =>
        q
          .eq('userId', userId)
          .eq('categoryId', args.categoryId)
          .eq('year', args.year)
          .eq('month', args.month)
      )
      .first();

    return budget ? toBudget(budget) : null;
  },
});

export const createOrUpdateBudget = mutation({
  args: {
    categoryId: v.string(),
    month: v.number(),
    year: v.number(),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_userId_categoryId_year_month', (q) =>
        q
          .eq('userId', userId)
          .eq('categoryId', args.categoryId)
          .eq('year', args.year)
          .eq('month', args.month)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount: args.amount,
        note: args.note,
        updatedAt: now,
      });
      return toBudget((await ctx.db.get(existing._id))!);
    }

    const budgetId = await ctx.db.insert('budgets', {
      ...args,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return toBudget((await ctx.db.get(budgetId))!);
  },
});

export const deleteBudget = mutation({
  args: { id: v.id('budgets') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // "Not found" rather than "forbidden" on someone else's row: the response
    // should not confirm that an id exists.
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Budget not found');
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const updateBudgetActual = mutation({
  args: {
    categoryId: v.string(),
    year: v.number(),
    month: v.number(),
    actual: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const existing = await ctx.db
      .query('budgets')
      .withIndex('by_userId_categoryId_year_month', (q) =>
        q
          .eq('userId', userId)
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
      return toBudget((await ctx.db.get(existing._id))!);
    }

    // A category can have actual spend with no budget set for the month.
    const now = Date.now();
    const budgetId = await ctx.db.insert('budgets', {
      userId,
      categoryId: args.categoryId,
      month: args.month,
      year: args.year,
      amount: 0,
      actual: args.actual,
      createdAt: now,
      updatedAt: now,
    });

    return toBudget((await ctx.db.get(budgetId))!);
  },
});

/**
 * Recompute each category's actual spend for a month from its transactions.
 *
 * Was a REST route that fetched transactions and categories over the network,
 * computed in Node, then issued one mutation per category. All three sides are
 * Convex now, so it is a single transaction.
 */
export const recalculateActuals = mutation({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const monthStart = new Date(args.year, args.month - 1, 1).getTime();
    const monthEnd = new Date(args.year, args.month, 0, 23, 59, 59).getTime();

    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const known = new Set(categories.map((category) => category.title));

    const actuals = new Map<string, number>();
    for (const transaction of transactions) {
      if (transaction.isDeleted === true || transaction.isInternal === true) {
        continue;
      }
      if (
        transaction.accountingDate < monthStart ||
        transaction.accountingDate > monthEnd
      ) {
        continue;
      }
      const category = transaction.category;
      if (!category || !known.has(category)) {
        continue;
      }
      // Debit is spend, credit offsets it.
      const contribution =
        transaction.type === 'debit' ? transaction.amount : -transaction.amount;
      actuals.set(category, (actuals.get(category) ?? 0) + contribution);
    }

    const budgets = await ctx.db
      .query('budgets')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const monthBudgets = budgets.filter(
      (b) => b.year === args.year && b.month === args.month
    );

    // A category that had transactions last run and none now must go back to
    // zero, not keep its stale actual.
    for (const budget of monthBudgets) {
      if (!actuals.has(budget.categoryId)) {
        actuals.set(budget.categoryId, 0);
      }
    }

    const now = Date.now();
    const byCategory = new Map(monthBudgets.map((b) => [b.categoryId, b]));

    for (const [categoryId, total] of actuals) {
      const actual = Math.abs(total);
      const existing = byCategory.get(categoryId);

      if (existing) {
        await ctx.db.patch(existing._id, { actual, updatedAt: now });
        continue;
      }

      await ctx.db.insert('budgets', {
        userId,
        categoryId,
        month: args.month,
        year: args.year,
        amount: 0,
        actual,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { categories: actuals.size };
  },
});
