'use client';

import { ConvexAuthNextjsProvider } from '@convex-dev/auth/nextjs';
import { ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';
import { AuthSync } from './auth-sync';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'NEXT_PUBLIC_CONVEX_URL is not set. The browser talks to Convex directly now, so the URL has to be public — CONVEX_URL alone is server-only.'
  );
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      <AuthSync>{children}</AuthSync>
    </ConvexAuthNextjsProvider>
  );
}
