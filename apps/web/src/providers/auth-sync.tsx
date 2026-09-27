'use client';

import { api } from '@kanak/convex/src/_generated/api';
import { useAuthToken } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

/**
 * Copies Convex Auth's token and viewer into the legacy auth store, so the
 * components still talking to /api routes keep working. Remove together with
 * the store once every route is gone.
 */
export function AuthSync({ children }: { children: React.ReactNode }) {
  const token = useAuthToken();
  const viewer = useQuery(api.users.viewer, token ? {} : 'skip');
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (!token) {
      setAuth(null, null);
      return;
    }
    setAuth(
      viewer
        ? {
            id: viewer.id,
            email: viewer.email ?? '',
            name: viewer.name ?? '',
            role: viewer.role ?? 'user',
          }
        : null,
      token
    );
  }, [token, viewer, setAuth]);

  return <>{children}</>;
}
