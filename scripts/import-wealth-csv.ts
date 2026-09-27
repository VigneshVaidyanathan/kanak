/**
 * One-off importer: npx tsx scripts/import-wealth-csv.ts <csv> <email> [--dry-run]
 * Uses the same code path as POST /api/wealth/import.
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';

config({ path: path.join(__dirname, '../apps/web/.env.local') });
config({ path: path.join(__dirname, '../apps/web/.env') });

async function main() {
  const [file, email] = process.argv.slice(2);
  const dryRun = process.argv.includes('--dry-run');
  if (!file || !email) {
    throw new Error('Usage: import-wealth-csv.ts <csv> <email> [--dry-run]');
  }

  const { getConvexClient } = await import('../packages/api/src/db');
  const { api } = await import('../packages/convex/src/_generated/api');
  const { getWealthSectionsByUserId } =
    await import('../packages/api/src/wealth');
  const { importWealthCsv } = await import('../apps/web/src/lib/wealth-import');

  const convex = await getConvexClient();
  const user = await convex.query(api.users.findUserByEmail, { email });
  if (!user) throw new Error(`No user with email ${email}`);

  const before = await getWealthSectionsByUserId(user._id);
  console.log(
    `user ${email} (${user._id}) currently has ${before.length} sections, ` +
      `${before.reduce((n, s) => n + (s.lineItems?.length ?? 0), 0)} line items`
  );
  for (const s of before) {
    console.log(
      `  ${s.name}: ${(s.lineItems ?? []).map((l: any) => l.name).join(', ')}`
    );
  }

  if (dryRun) {
    console.log('dry run, nothing written');
    return;
  }

  const result = await importWealthCsv(user._id, readFileSync(file, 'utf8'));
  console.log(result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
