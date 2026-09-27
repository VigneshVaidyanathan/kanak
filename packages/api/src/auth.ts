import { api } from '@kanak/convex/src/_generated/api';
import { getAuthedConvexClient } from './db';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Resolves a Convex Auth JWT to the user it belongs to.
 *
 * The JWT is verified by Convex itself (against the deployment's JWKS), so this
 * only has to ask Convex who the caller is. Sessions are Convex Auth's
 * concern now; nothing here issues or stores tokens.
 */
export async function verifyToken(token: string): Promise<AuthPayload> {
  const convex = await getAuthedConvexClient(token);
  const viewer = await convex.query(api.users.viewer, {});

  if (!viewer) {
    throw new Error('Invalid or expired token');
  }

  return {
    userId: viewer.id,
    email: viewer.email ?? '',
    role: viewer.role ?? 'user',
  };
}
