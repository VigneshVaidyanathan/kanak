import { httpAction } from './_generated/server.js';
import { readTurn, type ToolCall } from './lib/sse.js';
import { api } from './_generated/api.js';
import { buildSystemPrompt } from './lib/aiPrompt.js';
import { TOOL_SPECS, runTool } from './lib/aiTools.js';

/**
 * The assistant's streaming chat endpoint.
 *
 * This talks to OpenRouter with plain `fetch` and parses the SSE body by hand
 * rather than using the Vercel AI SDK. That is on purpose: every current AI SDK
 * release declares `undici`, a Node-only HTTP library, and Convex HTTP actions
 * run in the V8 runtime where Node built-ins do not exist. Roughly 150 lines of
 * web-standard code avoids the question entirely and keeps OPENROUTER_API_KEY
 * inside the Convex deployment env, where csvMapping.ts already expects it.
 *
 * Note for anyone editing this file: `ctx` here is an ActionCtx, so
 * `runMutation` and `scheduler` are in scope even though the assistant must
 * never write. Nothing below calls them, and scripts/check-ai-readonly.ts fails
 * if that changes.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_AI_MODEL = 'anthropic/claude-sonnet-5.5';

/** How many times the model may call tools before it has to answer. */
const MAX_STEPS = 6;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

function corsHeaders(origin: string | null) {
  // CLIENT_ORIGIN is set per deployment: `npx convex env set CLIENT_ORIGIN ...`.
  // convex.site is a different origin from the app, so this is not optional.
  const allowed = process.env.CLIENT_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed ?? origin ?? '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export const chatPreflight = httpAction(async (_ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request.headers.get('Origin')),
      'Access-Control-Max-Age': '86400',
    },
  });
});

export const chat = httpAction(async (ctx, request) => {
  const cors = corsHeaders(request.headers.get('Origin'));

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return new Response('Unauthorized', { status: 401, headers: cors });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return new Response('The AI assistant is not configured', {
      status: 503,
      headers: cors,
    });
  }

  const body = (await request.json()) as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    tzOffsetMinutes?: number;
  };

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response('messages is required', { status: 400, headers: cors });
  }

  // The model comes from the user's settings, never from the request body — the
  // browser does not get to choose what our API key pays for.
  const [settings, categories, bankAccounts] = await Promise.all([
    ctx.runQuery(api.userSettings.getUserSettings, {}),
    ctx.runQuery(api.categories.getCategoriesByUserId, {}),
    ctx.runQuery(api.bankAccounts.getBankAccountsByUserId, {}),
  ]);

  const tz = body.tzOffsetMinutes ?? 0;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt({
        today: new Date(Date.now() - tz * 60_000).toISOString().slice(0, 10),
        categories: categories as { title: string; type: string }[],
        bankAccounts: bankAccounts as { name: string }[],
      }),
    },
    ...body.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const { readable, writable } = new TransformStream();
  // Not awaited: the Response has to go back now so the browser can start
  // reading while the loop is still running.
  void runAgentLoop(
    ctx,
    writable,
    settings.aiModel ?? DEFAULT_AI_MODEL,
    messages,
    tz
  );

  return new Response(readable, {
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});

type Ctx = Parameters<Parameters<typeof httpAction>[0]>[0];

async function runAgentLoop(
  ctx: Ctx,
  writable: WritableStream,
  model: string,
  messages: ChatMessage[],
  tz: number
) {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event: unknown) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Title': 'Kanak',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          tools: TOOL_SPECS.map((t) => ({ type: 'function', function: t })),
        }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '');
        throw new Error(
          `OpenRouter ${response.status}: ${detail.slice(0, 300)}`
        );
      }

      const turn = await readTurn(response.body, (delta) =>
        send({ type: 'text', delta })
      );

      messages.push({
        role: 'assistant',
        content: turn.content || null,
        ...(turn.toolCalls.length ? { tool_calls: turn.toolCalls } : {}),
      });

      if (turn.toolCalls.length === 0) {
        await send({ type: 'done' });
        return;
      }

      for (const call of turn.toolCalls) {
        const args = safeParse(call.function.arguments);
        await send({
          type: 'tool-call',
          id: call.id,
          name: call.function.name,
          args,
        });

        let result: unknown;
        try {
          // The only path from the model to the database. Every AI_QUERIES
          // entry is a query, and a Convex query has no way to write.
          result = await runTool(ctx, call.function.name, args, tz);
        } catch (error) {
          result = {
            error: error instanceof Error ? error.message : String(error),
          };
        }

        await send({ type: 'tool-result', id: call.id, result });
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Ran out of steps with tool calls still pending.
    await send({
      type: 'error',
      message: `Gave up after ${MAX_STEPS} tool rounds. Try a narrower question.`,
    });
  } catch (error) {
    await send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Something went wrong',
    });
  } finally {
    await writer.close().catch(() => {});
  }
}

function safeParse(json: string): Record<string, any> {
  try {
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}
