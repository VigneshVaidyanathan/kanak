'use client';

import { install401Redirect } from '@/lib/fetch-401';

/**
 * Route protection lives in `src/middleware.ts` now — Convex Auth checks the
 * session there, before the page renders, so this component no longer polls,
 * reads localStorage, or redirects.
 *
 * It stays only to install the 401 handler for the /api routes that have not
 * moved to direct Convex calls yet. Delete it with the last route.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  install401Redirect();

  return <>{children}</>;
}
