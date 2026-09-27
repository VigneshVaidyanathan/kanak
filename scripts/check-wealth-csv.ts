/** Run: npx tsx scripts/check-wealth-csv.ts [path-to-csv] */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { parseWealthCsv } from '../apps/web/src/lib/wealth-csv';

const sample = [
  'w,,,',
  ',11-Sep-26,6-Aug-26,03-Jul-25',
  'Savings Accounts,,,',
  'Vignesh - Canara,"₹6,92,375",₹0,',
  'Savings Accounts,"₹6,92,375",₹0,₹0',
  'Change,-₹1,,',
  'Liability,,,',
  'Vidhya house loan,"₹1,000",,',
  'Liability,"₹1,000",,',
  'Grand Total,"₹7,92,375",,',
  'Notes: nothing to see,,,',
].join('\n');

const parsed = parseWealthCsv(sample);
assert.deepStrictEqual(parsed.dates, [
  '2026-09-11',
  '2026-08-06',
  '2025-07-03',
]);
assert.deepStrictEqual(
  parsed.sections.map((s) => [s.name, s.operation, s.lineItems.length]),
  [
    ['Savings Accounts', 'add', 1],
    ['Liability', 'subtract', 1],
  ]
);
assert.deepStrictEqual(parsed.sections[0].lineItems[0].amounts, {
  '2026-09-11': 692375,
  '2026-08-06': 0,
});
console.log('self-check ok');

const file = process.argv[2];
if (file) {
  const real = parseWealthCsv(readFileSync(file, 'utf8'));
  console.log(`${real.dates.length} dates, ${real.sections.length} sections`);
  for (const s of real.sections) {
    console.log(
      ` ${s.name} (${s.operation}): ${s.lineItems
        .map((l) => `${l.name}=${Object.keys(l.amounts).length}`)
        .join(', ')}`
    );
  }
}
