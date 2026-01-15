import { NextRequest } from 'next/server';
import { verifyToken, AuthPayload } from '@kanak/api';

export function getTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const token = request.cookies.get('token')?.value;
  if (token) {
    return token;
  }

  return null;
}

export async function verifyAuth(request: NextRequest): Promise<AuthPayload> {
  const token = getTokenFromRequest(request);

  if (!token) {
    throw new Error('No authentication token provided');
  }

  try {
    const payload = await verifyToken(token);
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function createAuthErrorResponse(message: string, status: number = 401) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
