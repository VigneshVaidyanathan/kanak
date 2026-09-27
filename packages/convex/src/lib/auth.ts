import { getAuthUserId } from '@convex-dev/auth/server';
import type { Auth } from 'convex/server';

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
