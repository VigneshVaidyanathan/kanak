import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import { ConvexError } from 'convex/values';
import type { MutationCtx } from './_generated/server.js';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // Hashing is Convex Auth's default (Scrypt). Pre-existing bcrypt hashes
      // cannot be verified by it, so migrations.ts resets them onto the same
      // account rather than leaving people with a password that silently fails.
      // `profile` runs on every flow, and its `email` is what sign-in looks the
      // account up by, so normalizing here keeps sign-up and sign-in agreeing.
      profile: (params) => {
        const email = (params.email as string).trim().toLowerCase();
        return {
          email,
          name: (params.name as string) ?? email,
          // Role is never taken from sign-up params — that would let anyone
          // register as an admin. Promotion happens out of band.
          role: 'user',
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Closes registration to invitees, and turns their invites into
     * memberships.
     *
     * This is the only gate on sign-up: the /signup page checks for an invite
     * too, but that check is a client calling a query, so it cannot be the
     * thing enforcing it. Throwing here rolls back the whole sign-up mutation,
     * including the user document this callback has just been handed.
     *
     * Runs on sign-in as well, hence the `existingUserId` guard: there is
     * nothing to claim, and the gate must not lock existing accounts out.
     */
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, profile }) {
      if (existingUserId !== null) {
        return;
      }

      // Convex Auth hands the callback an `AnyDataModel` ctx, so its `db` has
      // no idea about our tables or indexes.
      const db = ctx.db as MutationCtx['db'];

      const email = (profile.email as string | undefined)?.trim().toLowerCase();

      const invites = email
        ? await db
            .query('workspace_invites')
            .withIndex('by_email', (q) => q.eq('email', email))
            .collect()
        : [];

      if (invites.length === 0) {
        // The account just created counts, so the very first sign-up sees one.
        const users = await db.query('users').take(2);
        if (users.length > 1) {
          throw new ConvexError(
            'This email has no invite. Ask a family member to invite you first.'
          );
        }
        return;
      }

      const now = Date.now();
      for (const invite of invites) {
        await db.insert('workspace_members', {
          workspaceId: invite.workspaceId,
          userId,
          createdAt: now,
        });
        await db.delete(invite._id);
      }

      // No `activeWorkspaceId`: one workspace is auto-selected by
      // <WorkspaceGate>, several make it show the chooser. Picking one here
      // would just dump them into an arbitrary family.
    },
  },
});
