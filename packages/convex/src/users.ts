import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server.js';

// Internal: returns the whole user document, password hash included. Never make
// this public — the browser can reach public functions directly, so exposing it
// would hand out every bcrypt hash to anyone who can guess an email.
export const findUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
  },
});

// Public, but only ever answers yes/no: the setup page needs to know whether to
// offer sign-up, and a count would leak more than that.
export const hasUsers = query({
  args: {},
  handler: async (ctx) => {
    const first = await ctx.db.query('users').first();
    return first !== null;
  },
});

export const createUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      password: args.password, // Already hashed by the caller.
      role: args.role || 'user',
      createdAt: now,
      updatedAt: now,
    });

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },
});

// The signed-in user, for the client. Returns null rather than throwing so a
// page can render its unauthenticated state.
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// First account to sign up owns the instance. Requires being signed in already,
// and refuses once any admin exists, so it can't be used to escalate later.
export const claimFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Unauthorized');
    }

    const users = await ctx.db.query('users').collect();
    if (users.some((user) => user.role === 'admin')) {
      return { promoted: false };
    }

    await ctx.db.patch(userId, { role: 'admin', updatedAt: Date.now() });
    return { promoted: true };
  },
});
