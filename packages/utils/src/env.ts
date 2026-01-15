'use server';
import 'server-only';

import { z } from 'zod';

const envSchema = z.object({
  CONVEX_URL: z.string().min(1, 'CONVEX_URL is required'),
  CONVEX_AUTH_KEY: z.string().min(1, 'CONVEX_AUTH_KEY is required'),
});

type Env = z.infer<typeof envSchema>;

let env: Env | null = null;

export async function getEnv(): Promise<Env> {
  if (env) {
    return env;
  }

  const parsed = envSchema.safeParse({
    CONVEX_URL: process.env.CONVEX_URL,
    CONVEX_AUTH_KEY: process.env.CONVEX_AUTH_KEY,
  });

  if (!parsed.success) {
    console.error(
      '❌ Environment variable validation failed:',
      parsed.error.errors
    );
    throw new Error(
      `Invalid environment variables: ${parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
    );
  }

  env = parsed.data;
  return env;
}

export async function getConvexUrl(): Promise<string> {
  const env = await getEnv();
  return env.CONVEX_URL;
}

export async function getConvexAuthKey(): Promise<string> {
  const env = await getEnv();
  return env.CONVEX_AUTH_KEY;
}
