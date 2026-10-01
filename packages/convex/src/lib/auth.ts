import { getAuthUserId } from '@convex-dev/auth/server';
import type { Auth } from 'convex/server';
import type { QueryCtx } from '../_generated/server.js';

/**
 * The signed-in user, or a thrown error.
 *
 * Every handler that touches user-owned data takes its identity from here
 * rather than from an argument. A `userId` argument is only as trustworthy as
 * the caller, and the caller is now the browser.
 */
export async function requireUser(ctx: { auth: Auth }) {
  const userId = await getAuthUserId(ctx);

  if (userId === null) {
    throw new Error('Unauthorized');
  }

  return userId;
}

/**
 * The signed-in user *and* the workspace they are currently looking at.
 *
 * Financial data belongs to a workspace, not to a person, so this is what
 * every data handler scopes by. The workspace comes off the user document
 * rather than an argument for the same reason `requireUser` ignores arguments,
 * and it keeps every function signature free of a `workspaceId` the client
 * would otherwise have to thread through ~60 call sites.
 *
 * Membership is re-read on every call instead of being trusted from
 * `activeWorkspaceId` alone: removing someone has to take effect immediately,
 * even if their user document still points at the workspace.
 *
 * ponytail: one active workspace per account, shared across devices and tabs.
 * Two families open side by side would need a workspaceId argument on every
 * function — do that only if someone actually asks.
 */
export async function requireWorkspace(ctx: QueryCtx) {
  const userId = await requireUser(ctx);
  const user = await ctx.db.get(userId);
  const workspaceId = user?.activeWorkspaceId;

  if (!workspaceId) {
    throw new Error('No workspace selected');
  }

  const member = await ctx.db
    .query('workspace_members')
    .withIndex('by_workspaceId_userId', (q) =>
      q.eq('workspaceId', workspaceId).eq('userId', userId)
    )
    .unique();

  if (member === null) {
    throw new Error('Forbidden');
  }

  return { userId, workspaceId };
}
