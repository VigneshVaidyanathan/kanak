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

/** A fresh switch code. Random rather than user-chosen: nobody picks 000000. */
function newPin() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
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
      hasPin: boolean;
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
        // The code itself stays server-side; the switcher only needs to know
        // whether to ask for one.
        hasPin: workspace.pin !== undefined,
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
      pin: newPin(),
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
  args: { workspaceId: v.id('workspaces'), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    await assertMember(ctx, args.workspaceId, userId);

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new ConvexError('Family not found.');
    }

    // Only a switch *away from* a workspace asks for the code. The first pick
    // after signing in has nothing on screen to protect, and re-selecting the
    // workspace you are already in changes nothing.
    const user = await ctx.db.get(userId);
    const switching =
      user?.activeWorkspaceId !== undefined &&
      user.activeWorkspaceId !== args.workspaceId;

    if (switching && workspace.pin !== undefined) {
      if (args.pin?.trim() !== workspace.pin) {
        throw new ConvexError('That code is not right.');
      }
    }

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
 * Adds someone to a workspace by email.
 *
 * Registered already: they are added immediately and can read and edit every
 * transaction, budget and wealth entry in this workspace from their next page
 * load. Not registered: an invite row is written instead, and signing up with
 * that email turns it into a membership (auth.ts
 * `afterUserCreatedOrUpdated`). Either way there is no acceptance step, and
 * any member can do this. `removeMember` and `revokeInvite` are the way back.
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
      const pending = await ctx.db
        .query('workspace_invites')
        .withIndex('by_workspaceId_email', (q) =>
          q.eq('workspaceId', args.workspaceId).eq('email', email)
        )
        .unique();

      if (pending === null) {
        await ctx.db.insert('workspace_invites', {
          workspaceId: args.workspaceId,
          email,
          invitedBy: userId,
          createdAt: Date.now(),
        });
      }

      return { added: false, invited: true };
    }

    const existing = await ctx.db
      .query('workspace_members')
      .withIndex('by_workspaceId_userId', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('userId', user._id)
      )
      .unique();

    if (existing !== null) {
      return { added: false, invited: false };
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

    return { added: true, invited: false };
  },
});

/** Invites for this workspace that nobody has signed up against yet. */
export const listInvites = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await assertMember(ctx, args.workspaceId, userId);

    const invites = await ctx.db
      .query('workspace_invites')
      .withIndex('by_workspaceId', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();

    return invites.map((invite) => ({
      id: invite._id,
      email: invite.email,
      createdAt: invite.createdAt,
    }));
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id('workspace_invites') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      return;
    }
    await assertMember(ctx, invite.workspaceId, userId);
    await ctx.db.delete(args.inviteId);
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

/**
 * This workspace's switch code, for the family settings screen.
 *
 * Every member can read it: it is what they type to get back in, not a secret
 * kept from them.
 */
export const workspacePin = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await assertMember(ctx, args.workspaceId, userId);

    const workspace = await ctx.db.get(args.workspaceId);
    return workspace?.pin ?? null;
  },
});

/**
 * Sets or regenerates the switch code.
 *
 * `pin` omitted means "give me a new random one", which is also how a
 * workspace created before this column gets its first code.
 */
export const setWorkspacePin = mutation({
  args: { workspaceId: v.id('workspaces'), pin: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await assertMember(ctx, args.workspaceId, userId);

    const pin = args.pin === undefined ? newPin() : args.pin.trim();
    if (!/^\d{6}$/.test(pin)) {
      throw new ConvexError('The code has to be 6 digits.');
    }

    await ctx.db.patch(args.workspaceId, { pin, updatedAt: Date.now() });
    return pin;
  },
});
