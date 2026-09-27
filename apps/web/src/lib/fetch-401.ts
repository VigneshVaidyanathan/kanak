import { useAuthStore } from '@/store/auth-store';

// ponytail: one global fetch patch instead of 401 handling at ~46 call sites.
let installed = false;
let redirecting = false;

export function install401Redirect() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await original(input, init);

    if (response.status === 401) {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const path = url.startsWith('/')
        ? url
        : new URL(url, window.location.origin).pathname;

      // /api/auth/* owns its own 401s (bad login, token verify).
      const isOwnApi =
        path.startsWith('/api/') && !path.startsWith('/api/auth/');

      if (isOwnApi && !redirecting) {
        redirecting = true;
        useAuthStore.getState().clearAuth();
        window.location.href = '/auth';
      }
    }

    return response;
  };
}
