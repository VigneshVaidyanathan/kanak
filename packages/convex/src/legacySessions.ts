// DEAD CODE, pending deletion. Convex Auth replaced these hand-rolled sessions
// (see auth.ts); nothing calls them. They are `internal*` so the browser cannot
// reach them in the meantime.
//
// To remove: delete this file and the `sessions` table from schema.ts, then
// `npx convex codegen`.
import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server.js';

// Store sessions in Convex
export const createSession = internalMutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert('sessions', {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(sessionId);
  },
});

export const getSessionByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first();

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      session,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },
});

export const deleteSession = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});
