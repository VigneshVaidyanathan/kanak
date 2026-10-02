import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import type { QueryCtx } from './_generated/server.js';
import { mutation, query } from './_generated/server.js';
import { requireUser } from './lib/auth.js';

/** Throws unless the user is a member of the workspace. */
async function assertMember(
  ctx: QueryCtx,
  workspaceId: Id<'workspaces'>,
  userId: Id<'users'>
) {
  const membership = await ctx.db
    .query('workspace_members')
    .withIndex('by_workspaceId_userId', (q) =>
      q.eq('workspaceId', workspaceId).eq('userId', userId)
    )
    .unique();

  if (membership === null) {
    throw new Error('Forbidden');
  }

  return membership;
}

/**
 * Every workspace the signed-in user belongs to.
 *
 * Returns `isActive` rather than making the client compare against the viewer:
 * the chooser and the switcher both need exactly this, and it keeps the active
 * id out of the client's hands.
 *
 * Empty rather than thrown when unauthenticated, for the same reason
 * `users.viewer` returns null: the navbar's workspace switcher renders outside
 * the `<Authenticated>` gate, so this query fires before the auth token lands.
 */
export const myWorkspaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    const user = await ctx.db.get(userId);

    const memberships = await ctx.db
      .query('workspace_members')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    const workspaces: {
      id: Id<'workspaces'>;
      name: string;
      isActive: boolean;
    }[] = [];
    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      if (!workspace) {
        continue;
      }
      workspaces.push({
        id: workspace._id,
        name: workspace.name,
        isActive: user?.activeWorkspaceId === workspace._id,
      });
    }

    workspaces.sort((a, b) => a.name.localeCompare(b.name));
    return workspaces;
  },
});

/**
 * Creates a workspace, makes the creator a member, and switches them into it.
 *
 * Switching here is not a convenience: a workspace nobody is looking at has no
 * way to be reached, since there is no "all workspaces" screen.
 */
export const createWorkspace = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const name = args.name.trim();

    if (name.length === 0) {
      throw new ConvexError('Family name is required.');
    }

    const now = Date.now();
    const workspaceId = await ctx.db.insert('workspaces', {
      name,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('workspace_members', {
      workspaceId,
      userId,
      createdAt: now,
    });

    await ctx.db.patch(userId, {
      activeWorkspaceId: workspaceId,
      updatedAt: now,
    });

    return workspaceId;
  },
});

/**
 * Switches which workspace the user is looking at.
 *
 * Membership is checked here as well as in `requireWorkspace`: failing at the
 * switch gives a clear error, instead of leaving someone pointed at a
 * workspace where every subsequent query throws.
 */
export const setActiveWorkspace = mutation({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    await assertMember(ctx, args.workspaceId, userId);

    await ctx.db.patch(userId, {
      activeWorkspaceId: args.workspaceId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * The members of a workspace, for the family settings screen.
 *
 * Membership-gated rather than open: the response carries other people's
 * names and email addresses.
 */
export const listMembers = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await assertMember(ctx, args.workspaceId, userId);

    const memberships = await ctx.db
      .query('workspace_members')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();

    const members: {
      userId: Id<'users'>;
      name?: string;
      email?: string;
      isSelf: boolean;
      joinedAt: number;
    }[] = [];

    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (!user) {
        continue;
      }
      members.push({
        userId: user._id,
        name: user.name,
        email: user.email,
        isSelf: user._id === userId,
        joinedAt: membership.createdAt,
      });
    }

    members.sort((a, b) => a.joinedAt - b.joinedAt);
    return members;
  },
});

export const renameWorkspace = mutation({
  args: { workspaceId: v.id('workspaces'), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await assertMember(ctx, args.workspaceId, userId);

    const name = args.name.trim();
    if (name.length === 0) {
      throw new ConvexError('Family name is required.');
    }

    await ctx.db.patch(args.workspaceId, { name, updatedAt: Date.now() });
  },
});

/**
 * Adds an already-registered user to a workspace, by email.
 *
 * There is no invite or acceptance step: the person is added immediately and
 * can read and edit every transaction, budget and wealth entry in this
 * workspace from their next page load. Any member can do this to any
 * registered account. `removeMember` is the way back.
 */
export const addMember = mutation({
  args: { workspaceId: v.id('workspaces'), email: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await assertMember(ctx, args.workspaceId, userId);

    // Emails are normalized to lowercase at sign-in (auth.ts `profile`), so
    // the lookup has to be too.
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();

    if (!user) {
      throw new ConvexError(
        `No account for ${email}. They need to sign up before you can add them.`
      );
    }

    const existing = await ctx.db
      .query('workspace_members')
      .withIndex('by_workspaceId_userId', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id)
      )
      .unique();

    if (existing !== null) {
      return { added: false };
    }

    await ctx.db.insert('workspace_members', {
      workspaceId: args.workspaceId,
      userId: user._id,
      createdAt: Date.now(),
    });

    // Someone with nowhere to go lands here on their next sign-in.
    if (!user.activeWorkspaceId) {
      await ctx.db.patch(user._id, { activeWorkspaceId: args.workspaceId });
    }

    return { added: true };
  },
});

/**
 * Removes a member.
 *
 * The last member cannot be removed: a workspace with nobody in it holds data
 * no one can ever reach again. Someone removed while looking at this workspace
 * has `activeWorkspaceId` cleared, so their next query sends them to the
 * chooser rather than failing on `requireWorkspace`'s membership check.
 */
export const removeMember = mutation({
  args: { workspaceId: v.id('workspaces'), userId: v.id('users') },
  handler: async (ctx, args) => {
    const callerId = await requireUser(ctx);
    await assertMember(ctx, args.workspaceId, callerId);

    const memberships = await ctx.db
      .query('workspace_members')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();

    if (memberships.length <= 1) {
      throw new ConvexError('A family needs at least one member.');
    }

    const membership = memberships.find((m) => m.userId === args.userId);
    if (!membership) {
      return { removed: false };
    }

    await ctx.db.delete(membership._id);

    const removed = await ctx.db.get(args.userId);
    if (removed?.activeWorkspaceId === args.workspaceId) {
      await ctx.db.patch(args.userId, { activeWorkspaceId: undefined });
    }

    return { removed: true };
  },
});
