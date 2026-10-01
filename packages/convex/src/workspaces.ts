import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel.js';
import { internalMutation, mutation, query } from './_generated/server.js';
import { requireUser } from './lib/auth.js';

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
      throw new Error('Workspace name is required.');
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

    const membership = await ctx.db
      .query('workspace_members')
      .withIndex('by_workspaceId_userId', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', userId)
      )
      .unique();

    if (membership === null) {
      throw new Error('Forbidden');
    }

    await ctx.db.patch(userId, {
      activeWorkspaceId: args.workspaceId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Adds an already-registered user to a workspace.
 *
 *   cd packages/convex
 *   npx convex run workspaces:addMemberByEmail '{"workspaceId":"...","email":"them@example.com"}'
 *
 * ponytail: internal, so CLI-only on purpose — there is no invite or
 * acceptance flow yet, and an in-app "add by email" button without one would
 * let any member pull a stranger's account into their family's finances.
 * Idempotent: adding an existing member is a no-op.
 */
export const addMemberByEmail = internalMutation({
  args: { workspaceId: v.id('workspaces'), email: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error('No such workspace.');
    }

    // Emails are normalized to lowercase at sign-in (auth.ts `profile`), so
    // the lookup has to be too.
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();

    if (!user) {
      throw new Error(`No user with email ${email}. They must sign up first.`);
    }

    const existing = await ctx.db
      .query('workspace_members')
      .withIndex('by_workspaceId_userId', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id)
      )
      .unique();

    if (existing !== null) {
      return { added: false, workspace: workspace.name, email };
    }

    await ctx.db.insert('workspace_members', {
      workspaceId: args.workspaceId,
      userId: user._id,
      createdAt: Date.now(),
    });

    // A user with nowhere to go lands here on their next sign-in.
    if (!user.activeWorkspaceId) {
      await ctx.db.patch(user._id, { activeWorkspaceId: args.workspaceId });
    }

    return { added: true, workspace: workspace.name, email };
  },
});
