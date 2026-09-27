// ponytail: one global fetch patch instead of 401 handling at ~46 call sites.
let installed = false;
let redirecting = false;

/**
 * Sends the user back to sign in when a legacy /api route rejects them.
 *
 * Convex's own client handles its auth errors, so this only covers the REST
 * routes. It goes away when they do.
 */
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

      // Convex Auth owns /api/auth; its failures are not session errors.
      const isLegacyApi =
        path.startsWith('/api/') && !path.startsWith('/api/auth');

      if (isLegacyApi && !redirecting) {
        redirecting = true;
        window.location.href = '/auth';
      }
    }

    return response;
  };
}
