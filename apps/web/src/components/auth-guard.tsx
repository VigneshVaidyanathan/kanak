'use client';

import { useAuthStore } from '@/store/auth-store';
import { Spinner } from '@kanak/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/',
  '/dashboard',
  '/transactions',
  '/budget',
  '/reports',
  '/wealth',
  '/settings',
  '/quick-add',
  '/ask-ai',
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, isAuthenticated, initializeAuth, validateToken, clearAuth } =
    useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if current route requires authentication
      const isProtectedRoute =
        PROTECTED_ROUTES.includes(pathname) ||
        pathname.startsWith('/settings/') ||
        pathname.startsWith('/api/');

      if (!isProtectedRoute) {
        setIsChecking(false);
        return;
      }

      // Check localStorage for token
      if (typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem('auth-storage');

        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);

            if (parsed.state?.token && parsed.state?.user) {
              // Token exists, ensure store is updated
              if (!isAuthenticated) {
                const { setAuth } = useAuthStore.getState();
                setAuth(parsed.state.user, parsed.state.token);
              }

              // Validate token integrity
              const isValid = await validateToken();

              if (isValid) {
                setIsChecking(false);
                return;
              } else {
                // Token is invalid, clear auth and redirect
                clearAuth();
                router.push('/auth');
                return;
              }
            }
          } catch (e) {
            // Invalid stored data
            clearAuth();
          }
        }
      }

      // If no token and on protected route, redirect to auth
      if (!token && !isAuthenticated) {
        router.push('/auth');
        return;
      }

      // If token exists but not authenticated, validate it
      if (token && !isAuthenticated) {
        const isValid = await validateToken();
        if (isValid) {
          setIsChecking(false);
          return;
        } else {
          clearAuth();
          router.push('/auth');
          return;
        }
      }

      // If we reach here, everything looks good
      setIsChecking(false);
    };

    checkAuth();
  }, [
    router,
    pathname,
    token,
    isAuthenticated,
    initializeAuth,
    validateToken,
    clearAuth,
  ]);

  // Periodic token validation check (every 5 minutes)
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const interval = setInterval(
      async () => {
        const isValid = await validateToken();
        if (!isValid) {
          clearAuth();
          router.push('/auth');
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [token, isAuthenticated, validateToken, clearAuth, router]);

  // Listen for storage changes (logout from other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-storage' && !e.newValue) {
        // Auth was cleared from another tab
        clearAuth();
        router.push('/auth');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [clearAuth, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <Spinner />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
