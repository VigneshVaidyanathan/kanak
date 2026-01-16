import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import crypto from 'crypto';
import { getConvexClient } from './db';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

// Generate a secure random token
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function generateToken(payload: AuthPayload): Promise<string> {
  const convex = await getConvexClient();
  const token = generateSecureToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  await convex.mutation(api.auth.createSession, {
    userId: payload.userId as Id<'users'>,
    token,
    expiresAt,
  });

  return token;
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const convex = await getConvexClient();
  const result = await convex.query(api.auth.getSessionByToken, {
    token,
  });

  if (!result || !result.user) {
    throw new Error('Invalid or expired token');
  }

  return {
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
  };
}

export function decodeToken(token: string): AuthPayload | null {
  // For decode, we still need to verify to get the payload
  // This is a simplified version - in production, you might want to store token data differently
  return null;
}
