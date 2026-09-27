import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server.js';

// Public, but only ever answers yes/no: the setup page needs to know whether to
// offer sign-up, and a count would leak more than that.
export const hasUsers = query({
  args: {},
  handler: async (ctx) => {
    const first = await ctx.db.query('users').first();
    return first !== null;
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
