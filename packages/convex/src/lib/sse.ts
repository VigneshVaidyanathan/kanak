/**
 * Parsing for OpenAI-format server-sent events, as OpenRouter emits them.
 *
 * Its own module so scripts/check-sse-parse.ts can run it against a recorded
 * stream without a Convex deployment. The fragment handling below is the part
 * worth testing: arguments arrive a few characters at a time.
 */

export type ToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

/**
 * Read one OpenAI-format SSE turn, forwarding text as it arrives.
 *
 * Tool calls stream in fragments keyed by `index` — the name usually arrives in
 * the first chunk and the JSON arguments across many — so they are accumulated
 * by index and only assembled once the turn ends.
 */
export async function readTurn(
  body: ReadableStream<Uint8Array>,
  onText: (delta: string) => void | Promise<void>
): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let content = '';
  const partial = new Map<number, { id: string; name: string; args: string }>();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; keep the trailing partial one.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;

        const data = line.slice(5).trim();
        if (data === '' || data === '[DONE]') continue;

        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue; // OpenRouter sends ": keep-alive" comments and the odd partial
        }

        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          content += delta.content;
          await onText(delta.content);
        }

        for (const call of delta.tool_calls ?? []) {
          const slot = partial.get(call.index) ?? {
            id: '',
            name: '',
            args: '',
          };
          if (call.id) slot.id = call.id;
          if (call.function?.name) slot.name = call.function.name;
          if (call.function?.arguments) slot.args += call.function.arguments;
          partial.set(call.index, slot);
        }
      }
    }
  }

  const toolCalls: ToolCall[] = [...partial.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, slot]) => ({
      id: slot.id || `call_${index}`,
      type: 'function' as const,
      function: { name: slot.name, arguments: slot.args },
    }))
    .filter((c) => c.function.name);

  return { content, toolCalls };
}
