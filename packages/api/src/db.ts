import { ConvexHttpClient } from 'convex/browser';
import { getConvexUrl, getConvexAuthKey } from '@kanak/utils';

let convexClient: ConvexHttpClient | null = null;

export async function getConvexClient(): Promise<ConvexHttpClient> {
  if (convexClient) {
    return convexClient;
  }

  const url = await getConvexUrl();
  const authKey = await getConvexAuthKey();

  convexClient = new ConvexHttpClient(url);
  convexClient.setAuth(authKey);

  return convexClient;
}
