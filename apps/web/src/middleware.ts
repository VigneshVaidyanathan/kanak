import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server';

const isSignInPage = createRouteMatcher(['/auth', '/setup']);

// Everything except the sign-in pages, the auth handshake and static assets.
// Listing what is protected rather than what is public means a new page is
// private by default.
const isProtectedRoute = createRouteMatcher([
  '/',
  '/transactions(.*)',
  '/budget(.*)',
  '/reports(.*)',
  '/wealth(.*)',
  '/settings(.*)',
  '/quick-add(.*)',
  '/ask-ai(.*)',
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();

  if (isSignInPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, '/');
  }
  if (isProtectedRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, '/auth');
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
