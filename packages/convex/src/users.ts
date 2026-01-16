import { v } from 'convex/values';
import { mutation, query } from './_generated/server.js';

export const findUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
    return user;
  },
});

export const countUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users.length;
  },
});

export const createUser = mutation({
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
      password: args.password, // Should be hashed before calling
      role: args.role || 'user',
      createdAt: now,
      updatedAt: now,
    });

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Return only selected fields (matching Prisma select)
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
