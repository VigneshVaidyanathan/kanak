// Generates the RS256 keypair Convex Auth signs its JWTs with and sets it on a
// deployment. Mirrors `npx @convex-dev/auth`'s key step, which we don't use
// because its interactive setup rewrites files and assumes a `convex/` dir.
//
//   node scripts/generate-auth-keys.mjs           # dev deployment
//   node scripts/generate-auth-keys.mjs --prod    # production
//
// Keys are never printed or written to disk; they go straight to `convex env`.
import { generateKeyPairSync } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const target = process.argv.includes('--prod') ? ['--prod'] : [];
const siteUrl =
  process.env.SITE_URL ??
  (target.length ? undefined : 'http://localhost:4444');

if (!siteUrl) {
  console.error('Set SITE_URL for a production deployment, e.g.\n  SITE_URL=https://app.example.com node scripts/generate-auth-keys.mjs --prod');
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

const set = (name, value) =>
  execFileSync('npx', ['convex', 'env', 'set', ...target, name, '--', value], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });

set(
  'JWT_PRIVATE_KEY',
  privateKey.export({ type: 'pkcs8', format: 'pem' }).trimEnd().replace(/\n/g, ' ')
);
set(
  'JWKS',
  JSON.stringify({
    keys: [{ use: 'sig', ...publicKey.export({ format: 'jwk' }) }],
  })
);
set('SITE_URL', siteUrl);

console.log(`Set JWT_PRIVATE_KEY, JWKS and SITE_URL=${siteUrl}`);
