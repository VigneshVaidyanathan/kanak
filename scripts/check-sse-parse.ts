/**
 * The SSE parser behind the AI assistant. Run: npx tsx scripts/check-sse-parse.ts
 *
 * The fixture below is a real OpenRouter stream, trimmed: tool-call arguments
 * arrive a few characters at a time keyed only by `index`, the name and id come
 * only in the first fragment, and `: OPENROUTER PROCESSING` keep-alive comments
 * are interleaved. Getting any of that wrong produces a tool call with empty
 * arguments and an assistant that quietly answers from nothing.
 */
import assert from 'node:assert';
import { readTurn } from '../packages/convex/src/lib/sse';

const chunk = (delta: unknown) =>
  `data: ${JSON.stringify({ choices: [{ index: 0, delta }] })}\n\n`;

const fixture = [
  chunk({
    content: null,
    role: 'assistant',
    tool_calls: [
      {
        index: 0,
        id: 'toolu_01',
        type: 'function',
        function: { name: 'summarizeSpending', arguments: '' },
      },
    ],
  }),
  chunk({
    content: null,
    tool_calls: [
      { index: 0, function: { arguments: '{"startDate": "2026-03-01' } },
    ],
  }),
  ': OPENROUTER PROCESSING\n\n',
  chunk({
    content: null,
    tool_calls: [
      { index: 0, function: { arguments: '", "endDate": "2026-03-31' } },
    ],
  }),
  chunk({
    content: null,
    tool_calls: [
      { index: 0, function: { arguments: '", "groupBy": "category"}' } },
    ],
  }),
  // A second call in the same turn, to prove indexes don't bleed into each other.
  chunk({
    tool_calls: [
      {
        index: 1,
        id: 'toolu_02',
        type: 'function',
        function: { name: 'listCategories', arguments: '{}' },
      },
    ],
  }),
  chunk({ content: '' }),
  'data: [DONE]\n\n',
].join('');

/** Feed the fixture in awkward slices: frame boundaries will not line up. */
function streamOf(text: string, sliceSize: number): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset + sliceSize));
      offset += sliceSize;
    },
  });
}

async function main() {
  for (const sliceSize of [7, 64, 4096]) {
    const turn = await readTurn(streamOf(fixture, sliceSize), () => {});

    assert.strictEqual(
      turn.toolCalls.length,
      2,
      `slice ${sliceSize}: tool call count`
    );

    const [first, second] = turn.toolCalls;
    assert.strictEqual(first.id, 'toolu_01');
    assert.strictEqual(first.function.name, 'summarizeSpending');
    assert.deepStrictEqual(JSON.parse(first.function.arguments), {
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      groupBy: 'category',
    });

    assert.strictEqual(second.function.name, 'listCategories');
    assert.strictEqual(second.function.arguments, '{}');
  }

  // A plain text turn: deltas are forwarded as they arrive and joined in order.
  const textFixture =
    chunk({ content: 'You spent ' }) +
    chunk({ content: '₹12,400.' }) +
    'data: [DONE]\n\n';

  const seen: string[] = [];
  const turn = await readTurn(streamOf(textFixture, 5), (d) => {
    seen.push(d);
  });

  assert.strictEqual(turn.content, 'You spent ₹12,400.');
  assert.deepStrictEqual(seen, ['You spent ', '₹12,400.']);
  assert.strictEqual(turn.toolCalls.length, 0);

  console.log('self-check ok');
}

void main();
