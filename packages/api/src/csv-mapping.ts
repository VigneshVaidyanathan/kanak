import { api } from '@kanak/convex/src/_generated/api';
import type { MappableProperty, MapColumnsResult } from '@kanak/llm';
import { getConvexClient } from './db';

export async function suggestCsvColumnMapping(
  headers: string[],
  rows: string[][],
  properties: MappableProperty[]
): Promise<MapColumnsResult> {
  const convex = await getConvexClient();
  return await convex.action(api.csvMapping.suggestColumnMapping, {
    headers,
    rows,
    properties,
  });
}
