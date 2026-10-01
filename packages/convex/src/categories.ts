import { v } from 'convex/values';
import { Doc } from './_generated/dataModel.js';
import { mutation, query } from './_generated/server.js';
import { requireWorkspace } from './lib/auth.js';

// Matches the shape the deleted API layer used to map: `id`, not `_id`, and
// epoch-millisecond timestamps, since Convex cannot serialize a Date.
function toCategory(category: Doc<'categories'>) {
  return {
    id: category._id,
    title: category.title,
    color: category.color,
    icon: category.icon,
    description: category.description,
    type: category.type,
    priority: category.priority,
    active: category.active,
    userId: category.userId,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export const getCategoriesByUserId = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const categories = await ctx.db
      .query('categories')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', workspaceId))
      .collect();

    return categories
      .filter((c) => args.activeOnly === false || c.active)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(toCategory);
  },
});

export const getCategoryById = query({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const category = await ctx.db.get(args.id);
    if (!category || category.workspaceId !== workspaceId) {
      return null;
    }

    return toCategory(category);
  },
});

export const createCategory = mutation({
  args: {
    title: v.string(),
    color: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    priority: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, workspaceId } = await requireWorkspace(ctx);
    const now = Date.now();

    const categoryId = await ctx.db.insert('categories', {
      ...args,
      active: args.active ?? true,
      userId,
      workspaceId,
      createdAt: now,
      updatedAt: now,
    });

    return toCategory((await ctx.db.get(categoryId))!);
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id('categories'),
    title: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.string()),
    priority: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);
    const { id, ...updates } = args;

    // "Not found" rather than "forbidden" on someone else's row: the response
    // should not confirm that an id exists.
    const existing = await ctx.db.get(id);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('Category not found');
    }

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });

    return toCategory((await ctx.db.get(id))!);
  },
});

export const deactivateCategory = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const { workspaceId } = await requireWorkspace(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new Error('Category not found');
    }

    await ctx.db.patch(args.id, { active: false, updatedAt: Date.now() });

    return toCategory((await ctx.db.get(args.id))!);
  },
});
