import { getConvexUrl } from '@kanak/utils';
import { ConvexHttpClient } from 'convex/browser';

let convexClient: ConvexHttpClient | null = null;

export async function getConvexClient(): Promise<ConvexHttpClient> {
  if (convexClient) {
    return convexClient;
  }

  const url = await getConvexUrl();

  convexClient = new ConvexHttpClient(url);

  return convexClient;
}
