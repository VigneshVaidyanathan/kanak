// ponytail: one self-check over the answer->mapping logic. `npx tsx packages/llm/src/check.ts`
import assert from 'node:assert';
import { mapCsvColumns } from './index';

const fakeClient = (answers: Record<string, unknown>) =>
  ({ systemOne: async () => ({ answers }) }) as any;

const headers = ['Txn Date', 'Narration', 'Withdrawal', 'Deposit'];
const rows = [['01/04/2024', 'ATM', '500.00', '']];

const run = async () => {
  const result = await mapCsvColumns({
    headers,
    rows,
    properties: [
      { value: 'date', label: 'Transaction Date' },
      { value: 'description', label: 'Description' },
      { value: 'withdrawalAmount', label: 'Withdrawal Amount' },
      { value: 'depositAmount', label: 'Deposit Amount' },
      { value: 'category', label: 'Category' },
    ],
    client: fakeClient({
      date: { choice: 'column_0', confidence: 0.9 },
      description: { choice: 'column_1', confidence: 0.8 },
      // Both amount fields claim column 2: highest confidence keeps it.
      withdrawalAmount: { choice: 'column_2', confidence: 0.6 },
      depositAmount: { choice: 'column_2', confidence: 0.95 },
      // Below the confidence floor, so dropped.
      category: { choice: 'column_1', confidence: 0.2 },
      dateFormat: { choice: 'DD/MM/YYYY', confidence: 0.99 },
    }),
  });

  assert.strictEqual(result.columns.date.headerIndex, 0);
  assert.strictEqual(result.columns.description.headerIndex, 1);
  assert.strictEqual(result.columns.depositAmount.headerIndex, 2);
  assert.ok(!result.columns.withdrawalAmount);
  assert.ok(!result.columns.category);
  assert.strictEqual(result.dateFormat, 'DD/MM/YYYY');
  console.log('ok');
};

run();
