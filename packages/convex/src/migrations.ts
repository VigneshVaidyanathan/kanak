import { modifyAccountCredentials } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api.js';
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

// ---------------------------------------------------------------------------
// Workspaces backfill
// ---------------------------------------------------------------------------

/**
 * Every table whose rows belong to a workspace. `user_settings` is absent on
 * purpose: the AI model is a personal preference, not family data.
 */
const WORKSPACE_TABLES = [
  'transactions',
  'categories',
  'bank_accounts',
  'transaction_rules',
  'budgets',
  'wealth_sections',
  'wealth_line_items',
  'wealth_entries',
  'transaction_uploads',
  'transaction_history',
  'ai_chats',
  'ai_messages',
] as const;

type WorkspaceTable = (typeof WORKSPACE_TABLES)[number];

/**
 * Gives every existing user their own workspace.
 *
 * Data was per-user before workspaces existed, so the only migration that
 * cannot lose or merge anything is one-workspace-per-user. Families get joined
 * afterwards with `workspaces:addMemberByEmail`.
 *
 * Idempotent: a user who already has a membership is left alone.
 */
export const backfillWorkspacesForUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      const existing = await ctx.db
        .query('workspace_members')
        .withIndex('by_userId', (q) => q.eq('userId', user._id))
        .first();

      if (existing !== null) {
        // Already in a workspace; just make sure they are pointed at one.
        if (!user.activeWorkspaceId) {
          await ctx.db.patch(user._id, {
            activeWorkspaceId: existing.workspaceId,
          });
        }
        skipped++;
        continue;
      }

      const now = Date.now();
      const label = user.name ?? user.email ?? 'My';
      const workspaceId = await ctx.db.insert('workspaces', {
        name: `${label}'s Family`,
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert('workspace_members', {
        workspaceId,
        userId: user._id,
        createdAt: now,
      });

      await ctx.db.patch(user._id, {
        activeWorkspaceId: workspaceId,
        updatedAt: now,
      });

      created++;
    }

    return { created, skipped, total: users.length };
  },
});

/**
 * Stamps `workspaceId` onto one page of rows, from their `userId`.
 *
 * Paginated because `transactions` can be far larger than a single mutation is
 * allowed to read. The caller loops on the returned cursor —
 * `backfillWorkspaces` below does that.
 *
 * Idempotent: rows that already have a `workspaceId` are counted and skipped,
 * so a re-run reports `patched: 0`.
 */
export const backfillWorkspaceIds = internalMutation({
  args: {
    table: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!WORKSPACE_TABLES.includes(args.table as WorkspaceTable)) {
      throw new Error(
        `"${args.table}" is not a workspace-scoped table. Expected one of: ${WORKSPACE_TABLES.join(', ')}`
      );
    }

    const page = await ctx.db.query(args.table as WorkspaceTable).paginate({
      cursor: args.cursor ?? null,
      numItems: args.numItems ?? 500,
    });

    // One workspace lookup per distinct owner, not per row.
    const workspaceByUser = new Map<string, string | undefined>();
    let patched = 0;
    let skipped = 0;
    let orphaned = 0;

    for (const row of page.page) {
      if (row.workspaceId) {
        skipped++;
        continue;
      }

      let workspaceId = workspaceByUser.get(row.userId);
      if (workspaceId === undefined && !workspaceByUser.has(row.userId)) {
        const membership = await ctx.db
          .query('workspace_members')
          .withIndex('by_userId', (q) => q.eq('userId', row.userId))
          .first();
        workspaceId = membership?.workspaceId;
        workspaceByUser.set(row.userId, workspaceId);
      }

      if (!workspaceId) {
        // Owner has no workspace — run backfillWorkspacesForUsers first.
        orphaned++;
        continue;
      }

      await ctx.db.patch(row._id, { workspaceId: workspaceId as never });
      patched++;
    }

    return {
      table: args.table,
      patched,
      skipped,
      orphaned,
      isDone: page.isDone,
      cursor: page.continueCursor,
    };
  },
});

/**
 * The whole workspaces migration, in one command.
 *
 *   cd packages/convex
 *   npx convex run migrations:backfillWorkspaces
 *
 * Safe to re-run: every step above is idempotent.
 */
export const backfillWorkspaces = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runMutation(
      internal.migrations.backfillWorkspacesForUsers,
      {}
    );

    const tables: Record<string, { patched: number; orphaned: number }> = {};

    for (const table of WORKSPACE_TABLES) {
      let cursor: string | null = null;
      let patched = 0;
      let orphaned = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const result: {
          patched: number;
          orphaned: number;
          isDone: boolean;
          cursor: string;
        } = await ctx.runMutation(internal.migrations.backfillWorkspaceIds, {
          table,
          cursor,
        });

        patched += result.patched;
        orphaned += result.orphaned;

        if (result.isDone) {
          break;
        }
        cursor = result.cursor;
      }

      tables[table] = { patched, orphaned };
    }

    return { users, tables };
  },
});
