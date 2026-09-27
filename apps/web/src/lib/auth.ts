import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { AuthPayload, verifyToken } from '@kanak/api';
import { NextRequest } from 'next/server';

/**
 * Identity for the API routes that have not moved to direct Convex calls yet.
 *
 * The token comes from the cookie Convex Auth's middleware maintains, not from
 * the request — an `Authorization` header is no longer how this app
 * authenticates. `request` is kept so the ~35 call sites don't all have to
 * change on the same day; it is unused.
 */
export async function verifyAuth(_request?: NextRequest): Promise<AuthPayload> {
  const token = await convexAuthNextjsToken();

  if (!token) {
    throw new Error('No authentication token provided');
  }

  return await verifyToken(token);
}

export function createAuthErrorResponse(message: string, status: number = 401) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
