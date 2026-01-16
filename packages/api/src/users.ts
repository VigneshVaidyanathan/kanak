import { api } from '@kanak/convex/src/_generated/api';
import { CreateUserInput } from '@kanak/shared';
import bcrypt from 'bcryptjs';
import { getConvexClient } from './db';

// Helper to convert Convex document to API format
function convertUserFromConvex(user: any): any {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    password: user.password,
    role: user.role,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

export async function findUserByEmail(email: string): Promise<any> {
  const convex = await getConvexClient();
  const user = await convex.query(api.users.findUserByEmail, { email });
  return convertUserFromConvex(user);
}

export async function createUser(
  input: CreateUserInput & { role?: string }
): Promise<any> {
  const convex = await getConvexClient();
  const hashedPassword = await bcrypt.hash(input.password, 10);

  const user = await convex.mutation(api.users.createUser, {
    email: input.email,
    name: input.name,
    password: hashedPassword,
    role: input.role || 'user',
  });

  return convertUserFromConvex(user);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function countUsers(): Promise<number> {
  const convex = await getConvexClient();
  const count = await convex.query(api.users.countUsers, {});

  // Ensure we return a number
  if (typeof count !== 'number') {
    return 0;
  }

  return count;
}
