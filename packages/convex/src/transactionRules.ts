import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';

export const getTransactionRulesByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const rules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    // Sort by order asc, createdAt desc
    return rules.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return b.createdAt - a.createdAt;
    });
  },
});

export const getTransactionRuleById = query({
  args: {
    id: v.id('transaction_rules'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.id);
    if (!rule || rule.userId !== args.userId) {
      return null;
    }
    return rule;
  },
});

export const createTransactionRule = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    filter: v.any(),
    action: v.any(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the maximum order value for this user
    const rules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    const maxOrder = rules.reduce((max, r) => Math.max(max, r.order), -1);

    const newOrder = args.order !== undefined ? args.order : maxOrder + 1;

    const now = Date.now();
    const ruleId = await ctx.db.insert('transaction_rules', {
      title: args.title,
      filter: args.filter,
      action: args.action,
      order: newOrder,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(ruleId);
  },
});

export const updateTransactionRule = mutation({
  args: {
    id: v.id('transaction_rules'),
    userId: v.id('users'),
    title: v.optional(v.string()),
    filter: v.optional(v.any()),
    action: v.optional(v.any()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;

    // Verify ownership
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Transaction rule not found');
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.filter !== undefined) updateData.filter = updates.filter;
    if (updates.action !== undefined) updateData.action = updates.action;
    if (updates.order !== undefined) updateData.order = updates.order;

    await ctx.db.patch(id, updateData);
    return await ctx.db.get(id);
  },
});

export const deleteTransactionRule = mutation({
  args: {
    id: v.id('transaction_rules'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error('Transaction rule not found');
    }

    const deletedOrder = existing.order;

    await ctx.db.delete(args.id);

    // Reorder remaining rules to fill the gap
    const remainingRules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    const rulesToUpdate = remainingRules.filter((r) => r.order > deletedOrder);
    await Promise.all(
      rulesToUpdate.map((rule) =>
        ctx.db.patch(rule._id, {
          order: rule.order - 1,
          updatedAt: Date.now(),
        })
      )
    );

    return existing;
  },
});

export const updateTransactionRulesOrder = mutation({
  args: {
    userId: v.id('users'),
    updates: v.array(
      v.object({
        id: v.id('transaction_rules'),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Verify all rules belong to the user
    const ruleIds = args.updates.map((u) => u.id);
    const userRules = await Promise.all(ruleIds.map((id) => ctx.db.get(id)));

    const invalidRules = userRules.filter(
      (r) => !r || r.userId !== args.userId
    );

    if (invalidRules.length > 0) {
      throw new Error(
        'Some transaction rules not found or do not belong to user'
      );
    }

    // Update each rule's order
    await Promise.all(
      args.updates.map((update) =>
        ctx.db.patch(update.id, {
          order: update.order,
          updatedAt: Date.now(),
        })
      )
    );

    // Return updated rules
    const rules = await ctx.db
      .query('transaction_rules')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    return rules.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return b.createdAt - a.createdAt;
    });
  },
});
