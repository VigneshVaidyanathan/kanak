import { modifyAccountCredentials } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internalAction, internalMutation } from './_generated/server.js';

/**
 * Links every pre-Convex-Auth user to an `authAccounts` row.
 *
 * Convex Auth looks accounts up by `["password", <email>]`, and the row it
 * finds is what ties a sign-in to an existing `users` document. Without it,
 * signing up with the same email would create a *second* user, orphaning every
 * transaction, budget and wealth row that holds the original `userId`.
 *
 * The row is created without a secret: the old `users.password` is a bcrypt
 * hash, and Convex Auth hashes with Scrypt, so the old hash can never verify.
 * Run `setPassword` afterwards to give each account a working password.
 *
 *   cd packages/convex
 *   npx convex run migrations:backfillPasswordAccounts
 *
 * Idempotent — existing accounts are left alone.
 */
export const backfillPasswordAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Emails are normalized to lowercase at sign-in (see auth.ts `profile`),
      // so the account id has to be stored the same way.
      const email = user.email?.trim().toLowerCase();

      if (!email) {
        skipped++;
        continue;
      }

      const existing = await ctx.db
        .query('authAccounts')
        .withIndex('providerAndAccountId', (q) =>
          q.eq('provider', 'password').eq('providerAccountId', email)
        )
        .first();

      if (existing !== null) {
        skipped++;
        continue;
      }

      await ctx.db.insert('authAccounts', {
        userId: user._id,
        provider: 'password',
        providerAccountId: email,
      });

      if (user.email !== email) {
        await ctx.db.patch(user._id, { email });
      }

      created++;
    }

    return { created, skipped, total: users.length };
  },
});

/**
 * Sets a password on an existing account, hashed the way Convex Auth expects.
 *
 * This is how a pre-Convex-Auth user gets back in: their account keeps its
 * `userId`, so all their data stays attached, but the secret is replaced with
 * one Scrypt can verify.
 *
 *   npx convex run migrations:setPassword '{"email":"you@example.com","password":"..."}'
 *
 * The password is passed on the command line, so treat it as disclosed: change
 * it from the app once you are signed in.
 */
export const setPassword = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    if (args.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    await modifyAccountCredentials(ctx, {
      provider: 'password',
      account: { id: email, secret: args.password },
    });

    return { email };
  },
});

/**
 * Clears the dead `users.password` field once everyone has a working Convex
 * Auth password. The bcrypt hashes it holds are unverifiable now, so this is
 * removing dead weight, not credentials.
 *
 *   npx convex run migrations:dropLegacyPasswordField
 */
export const dropLegacyPasswordField = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    let cleared = 0;

    for (const user of users) {
      if (user.password === undefined) {
        continue;
      }
      await ctx.db.patch(user._id, { password: undefined });
      cleared++;
    }

    return { cleared, total: users.length };
  },
});
