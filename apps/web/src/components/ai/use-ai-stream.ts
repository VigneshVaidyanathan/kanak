'use client';

import { useAuthToken } from '@convex-dev/auth/react';
import { useCallback, useRef, useState } from 'react';

/**
 * One piece of an assistant turn. Text and tool calls interleave in the order
 * they happened, which is also the order they render.
 */
export type MessagePart =
  | { type: 'text'; text: string }
  | {
      type: 'tool';
      id: string;
      name: string;
      args: unknown;
      result?: unknown;
      error?: string;
    };

export type ChatMessage = {
  role: 'user' | 'assistant';
  parts: MessagePart[];
};

export type StreamStatus = 'idle' | 'submitted' | 'streaming';

export const messageText = (message: ChatMessage) =>
  message.parts
    .filter(
      (p): p is Extract<MessagePart, { type: 'text' }> => p.type === 'text'
    )
    .map((p) => p.text)
    .join('');

/**
 * The Convex HTTP router lives on `.convex.site`, a sibling of the
 * `.convex.cloud` host the reactive client uses.
 */
function chatEndpoint() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  return `${url.replace(/\.convex\.cloud$/, '.convex.site')}/ai/chat`;
}

/**
 * Reads the assistant's SSE stream.
 *
 * Hand-rolled rather than `useChat`, to match the server: the endpoint is a
 * Convex HTTP action speaking our own event shape, not the AI SDK's UI message
 * protocol, so there is no SDK to hold up either end.
 */
export function useAiStream(onFinish?: (assistant: ChatMessage) => void) {
  const token = useAuthToken();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback((initial: ChatMessage[] = []) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages(initial);
    setStatus('idle');
    setError(null);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || status !== 'idle') return;

      const user: ChatMessage = {
        role: 'user',
        parts: [{ type: 'text', text }],
      };
      const history = [...messages, user];

      setMessages([...history, { role: 'assistant', parts: [] }]);
      setStatus('submitted');
      setError(null);

      // Mutates the last message in place, since deltas arrive many per second.
      const patchAssistant = (fn: (parts: MessagePart[]) => MessagePart[]) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, parts: fn(last.parts) };
          return next;
        });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(chatEndpoint(), {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: history.map((m) => ({
              role: m.role,
              content: messageText(m),
            })),
            // Accounting dates were written from a browser, so the server needs
            // this offset to turn "last month" into the right epoch window.
            tzOffsetMinutes: new Date().getTimezoneOffset(),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(
            response.status === 401
              ? 'Your session expired. Reload the page.'
              : await response
                  .text()
                  .catch(() => 'The assistant is unavailable')
          );
        }

        setStatus('streaming');
        await readEvents(response.body, (event) => {
          switch (event.type) {
            case 'text':
              patchAssistant((parts) => {
                const last = parts[parts.length - 1];
                if (last?.type === 'text') {
                  return [
                    ...parts.slice(0, -1),
                    { type: 'text', text: last.text + event.delta },
                  ];
                }
                return [...parts, { type: 'text', text: event.delta }];
              });
              break;

            case 'tool-call':
              patchAssistant((parts) => [
                ...parts,
                {
                  type: 'tool',
                  id: event.id,
                  name: event.name,
                  args: event.args,
                },
              ]);
              break;

            case 'tool-result':
              patchAssistant((parts) =>
                parts.map((p) =>
                  p.type === 'tool' && p.id === event.id
                    ? {
                        ...p,
                        result: event.result,
                        error:
                          event.result &&
                          typeof event.result === 'object' &&
                          'error' in (event.result as object)
                            ? String((event.result as { error: unknown }).error)
                            : undefined,
                      }
                    : p
                )
              );
              break;

            case 'error':
              setError(event.message);
              break;
          }
        });

        setMessages((prev) => {
          onFinish?.(prev[prev.length - 1]);
          return prev;
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError(e instanceof Error ? e.message : 'Something went wrong');
        }
      } finally {
        abortRef.current = null;
        setStatus('idle');
      }
    },
    [messages, onFinish, status, token]
  );

  return { messages, status, error, send, stop, reset, setMessages };
}

type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool-call'; id: string; name: string; args: unknown }
  | { type: 'tool-result'; id: string; result: unknown }
  | { type: 'error'; message: string }
  | { type: 'done' };

/** Split an SSE body into events, keeping the trailing partial frame. */
async function readEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          onEvent(JSON.parse(line.slice(5).trim()) as StreamEvent);
        } catch {
          // A frame we can't parse is a frame we can't act on.
        }
      }
    }
  }
}
