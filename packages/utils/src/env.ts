'use server';
import 'server-only';

import { z } from 'zod';

const envSchema = z.object({
  CONVEX_URL: z.string().min(1, 'CONVEX_URL is required'),
});

type Env = z.infer<typeof envSchema>;

let env: Env | null = null;

export async function getEnv(): Promise<Env> {
  if (env) {
    return env;
  }

  const envValues = {
    CONVEX_URL: process.env.CONVEX_URL,
  };

  // Check for common typos
  const allEnvKeys = Object.keys(process.env);
  const convexUrlVariants = allEnvKeys.filter(
    (key) =>
      key.toUpperCase().includes('CONVEX') && key.toUpperCase().includes('URL')
  );
  if (convexUrlVariants.length > 0 && !envValues.CONVEX_URL) {
    console.warn(
      '⚠️  Found similar environment variable names:',
      convexUrlVariants.join(', '),
      '- Did you mean CONVEX_URL?'
    );
  }

  const parsed = envSchema.safeParse(envValues);

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
