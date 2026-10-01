import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';
import { requireUser } from './lib/auth.js';

/**
 * The signed-in user's app preferences. Returns a row shape even when none has
 * been written yet, so callers never branch on null.
 */
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    const settings = await ctx.db
      .query('user_settings')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    return { aiModel: settings?.aiModel };
  },
});

/** Set the default OpenRouter model for the AI assistant. */
export const setAiModel = mutation({
  args: { model: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('user_settings')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { aiModel: args.model, updatedAt: now });
      return { aiModel: args.model };
    }

    await ctx.db.insert('user_settings', {
      userId,
      aiModel: args.model,
      createdAt: now,
      updatedAt: now,
    });

    return { aiModel: args.model };
  },
});
