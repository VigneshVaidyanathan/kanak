import { mapCsvColumns } from '@kanak/llm';
import { v } from 'convex/values';
import { action } from './_generated/server.js';
import { requireUser } from './lib/auth.js';

/**
 * Suggest a CSV-column -> transaction-field mapping using Jev.
 * The API key lives in the Convex deployment environment:
 *   npx convex env set OPENROUTER_API_KEY <key>
 */
export const suggestColumnMapping = action({
  args: {
    headers: v.array(v.string()),
    rows: v.array(v.array(v.string())),
    properties: v.array(
      v.object({
        value: v.string(),
        label: v.string(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // This spends the deployment's OpenRouter credit, so it is not open to
    // unauthenticated callers. No workspace is needed: the rows come from the
    // caller's own file and nothing is read from or written to the database.
    await requireUser(ctx);

    if (!process.env.OPENROUTER_API_KEY && !process.env.TYPESAFE_API_KEY) {
      throw new Error('Auto-mapping is not configured');
    }

    return await mapCsvColumns({
      headers: args.headers,
      rows: args.rows,
      properties: args.properties,
    });
  },
});
