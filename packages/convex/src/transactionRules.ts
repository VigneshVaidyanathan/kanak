import { v } from 'convex/values';
import { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { requireUser } from './lib/auth.js';

// Matches the shape the deleted API layer used to map: `id`, not `_id`, and
// epoch-millisecond timestamps, since Convex cannot serialize a Date.
function toRule(rule: Doc<'transaction_rules'>) {
  return {
    id: rule._id,
    title: rule.title,
    filter: rule.filter,
    action: rule.action,
    order: rule.order,
    userId: rule.userId,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

// Priority order: lowest `order` wins, ties broken by newest first.
function byPriority(a: Doc<'transaction_rules'>, b: Doc<'transaction_rules'>) {
  return a.order !== b.order ? a.order - b.order : b.createdAt - a.createdAt;
}

export const getTransactionRulesByUserId = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    const rules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return rules.sort(byPriority).map(toRule);
  },
});

export const getTransactionRuleById = query({
  args: { id: v.id('transaction_rules') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const rule = await ctx.db.get(args.id);
    if (!rule || rule.userId !== userId) {
      return null;
    }

    return toRule(rule);
  },
});

export const createTransactionRule = mutation({
  args: {
    title: v.string(),
    filter: v.any(),
    action: v.any(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const rules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const maxOrder = rules.reduce((max, r) => Math.max(max, r.order), -1);
    const now = Date.now();

    const ruleId = await ctx.db.insert('transaction_rules', {
      title: args.title,
      filter: args.filter,
      action: args.action,
      order: args.order ?? maxOrder + 1,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    return toRule((await ctx.db.get(ruleId))!);
  },
});

export const updateTransactionRule = mutation({
  args: {
    id: v.id('transaction_rules'),
    title: v.optional(v.string()),
    filter: v.optional(v.any()),
    action: v.optional(v.any()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const { id, ...updates } = args;

    // "Not found" rather than "forbidden" on someone else's row: the response
    // should not confirm that an id exists.
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Transaction rule not found');
    }

    // Only the fields actually supplied — `patch` would otherwise write
    // `undefined` over a field the caller never mentioned.
    const patch: Partial<Doc<'transaction_rules'>> = { updatedAt: Date.now() };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.filter !== undefined) patch.filter = updates.filter;
    if (updates.action !== undefined) patch.action = updates.action;
    if (updates.order !== undefined) patch.order = updates.order;

    await ctx.db.patch(id, patch);

    return toRule((await ctx.db.get(id))!);
  },
});

export const deleteTransactionRule = mutation({
  args: { id: v.id('transaction_rules') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Transaction rule not found');
    }

    const deletedOrder = existing.order;
    await ctx.db.delete(args.id);

    // Close the gap so `order` stays contiguous.
    const remaining = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    await Promise.all(
      remaining
        .filter((r) => r.order > deletedOrder)
        .map((rule) =>
          ctx.db.patch(rule._id, {
            order: rule.order - 1,
            updatedAt: Date.now(),
          })
        )
    );

    return toRule(existing);
  },
});

export const updateTransactionRulesOrder = mutation({
  args: {
    updates: v.array(
      v.object({ id: v.id('transaction_rules'), order: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Check every rule before writing any of them, so a request that includes
    // one foreign id cannot reorder the rest.
    const rules = await Promise.all(
      args.updates.map((update) => ctx.db.get(update.id))
    );

    if (rules.some((rule) => !rule || rule.userId !== userId)) {
      throw new Error(
        'Some transaction rules not found or do not belong to user'
      );
    }

    await Promise.all(
      args.updates.map((update) =>
        ctx.db.patch(update.id, {
          order: update.order,
          updatedAt: Date.now(),
        })
      )
    );

    const updated = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return updated.sort(byPriority).map(toRule);
  },
});
