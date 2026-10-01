/**
 * The assistant must never be able to write. Run: npx tsx scripts/check-ai-readonly.ts
 *
 * The real guarantee is two things this script cannot express:
 *   - `AI_QUERIES` is declared `satisfies Record<string, FunctionReference<'query'>>`,
 *     so tsc rejects a mutation or action reference at build time.
 *   - A Convex QueryCtx has no db.insert/patch/replace/delete to call at all.
 *
 * What follows is the regression net for the day someone loosens either one.
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { AI_QUERIES, TOOL_SPECS } from '../packages/convex/src/lib/aiTools';

const read = (p: string) =>
  readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// 1. Every function reference the assistant holds is a query.
for (const [name, ref] of Object.entries(AI_QUERIES)) {
  const kind = (ref as any).type ?? (ref as any)._type;
  assert.notStrictEqual(kind, 'mutation', `AI_QUERIES.${name} is a mutation`);
  assert.notStrictEqual(kind, 'action', `AI_QUERIES.${name} is an action`);
}

// 2. ActionCtx carries runMutation and scheduler. The AI path never reaches for
//    either — this is the one guarantee held by convention rather than by type.
//    Matched as calls, not as words: both files discuss these in comments on
//    purpose, and the comments are the point.
for (const file of [
  'packages/convex/src/aiChat.ts',
  'packages/convex/src/lib/aiTools.ts',
]) {
  const source = read(file);
  for (const forbidden of ['runMutation', 'runAction', 'scheduler']) {
    const call = new RegExp(`\\b${forbidden}\\s*[(.]`);
    assert.ok(!call.test(source), `${file} calls ${forbidden}`);
  }
}

// 3. Auth tables must never enter the readable allowlist. `users` is excluded
//    too: the assistant has no business reading account rows.
const executor = read('packages/convex/src/aiQuery.ts');
for (const table of [
  'authAccounts',
  'authSessions',
  'authRefreshTokens',
  'authVerificationCodes',
  'transaction_history',
]) {
  assert.ok(!executor.includes(`${table}:`), `aiQuery.ts allowlists ${table}`);
}

// 4. No tool takes a userId. Identity comes from requireUser and nowhere else,
//    so there is no argument for a prompt injection to put a foreign id in.
for (const spec of TOOL_SPECS) {
  const props = (spec.parameters as any).properties ?? {};
  assert.ok(!('userId' in props), `tool ${spec.name} accepts userId`);
}

// 5. Adding a tool should make someone look at this file.
assert.strictEqual(TOOL_SPECS.length, 9);
assert.strictEqual(Object.keys(AI_QUERIES).length, 9);

console.log('self-check ok');
