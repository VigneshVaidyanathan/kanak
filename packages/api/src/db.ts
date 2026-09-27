import { getConvexUrl } from '@kanak/utils';
import { ConvexHttpClient } from 'convex/browser';

let convexClient: ConvexHttpClient | null = null;

/**
 * Shared, unauthenticated client. Only for functions that take no identity.
 */
export async function getConvexClient(): Promise<ConvexHttpClient> {
  if (convexClient) {
    return convexClient;
  }

  const url = await getConvexUrl();

  convexClient = new ConvexHttpClient(url);

  return convexClient;
}

/**
 * A client bound to one user's Convex Auth token.
 *
 * Deliberately not cached: `setAuth` mutates the client, so a shared instance
 * would let one request's token be used by whichever request runs next.
 */
export async function getAuthedConvexClient(
  token: string
): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(await getConvexUrl());
  client.setAuth(token);
  return client;
}
