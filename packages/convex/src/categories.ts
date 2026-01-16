import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';

export const getCategoriesByUserId = query({
  args: {
    userId: v.id('users'),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('categories')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId));

    const categories = await query.collect();

    let filtered = categories;
    if (args.activeOnly !== false) {
      filtered = categories.filter((c) => c.active);
    }

    // Sort by title ascending
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  },
});

export const getCategoryById = query({
  args: {
    id: v.id('categories'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    if (!category || category.userId !== args.userId) {
      return null;
    }
    return category;
  },
});

export const createCategory = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    color: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    priority: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const categoryId = await ctx.db.insert('categories', {
      title: args.title,
      color: args.color,
      icon: args.icon,
      description: args.description,
      type: args.type,
      priority: args.priority,
      active: args.active ?? true,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(categoryId);
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id('categories'),
    userId: v.id('users'),
    title: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    priority: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, userId, ...updates } = args;

    // Verify ownership - Convex doesn't support compound where, so we check manually
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) {
      throw new Error('Category not found');
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const deactivateCategory = mutation({
  args: {
    id: v.id('categories'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify ownership
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error('Category not found');
    }

    await ctx.db.patch(args.id, {
      active: false,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});
