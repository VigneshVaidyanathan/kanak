'use client';

import { useAuthStore } from '@/store/auth-store';
import { loginSchema } from '@kanak/shared';
import { Button, Input, Label, Spinner } from '@kanak/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, token, isAuthenticated, initializeAuth, validateToken } =
    useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      await initializeAuth();

      // Get redirect URL from query parameters
      const redirectUrl = searchParams.get('redirect') || '/dashboard';

      // Check localStorage directly for JWT
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('auth-storage');
        if (storedToken) {
          try {
            const parsed = JSON.parse(storedToken);
            if (parsed.state?.token && parsed.state?.user) {
              // JWT exists in localStorage, ensure store is updated
              const storeState = useAuthStore.getState();
              if (
                !storeState.token ||
                storeState.token !== parsed.state.token
              ) {
                // Update store with token from localStorage
                storeState.setAuth(parsed.state.user, parsed.state.token);
              }

              // Validate token
              const isValid = await validateToken();
              if (isValid) {
                // Valid JWT, redirect to dashboard or redirect parameter
                router.push(redirectUrl);
                return;
              } else {
                // Invalid token, clear it and continue to login
                const { clearAuth } = useAuthStore.getState();
                clearAuth();
              }
            }
          } catch (e) {
            // Invalid stored data, continue to login
          }
        }
      }

      // Also check zustand store state (after initializeAuth should have loaded it)
      if (token) {
        // Validate token before redirecting
        const isValid = await validateToken();
        if (isValid) {
          router.push(redirectUrl);
          return;
        } else {
          // Invalid token, clear it
          const { clearAuth } = useAuthStore.getState();
          clearAuth();
        }
      }

      // Check if any users exist in the system
      try {
        const response = await fetch('/api/setup/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (!data.hasUsers) {
          router.push('/setup');
          return;
        }
      } catch (error) {
        console.error('Error checking users:', error);
        // Continue to login page if check fails
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [
    router,
    token,
    isAuthenticated,
    initializeAuth,
    validateToken,
    searchParams,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validatedData = loginSchema.parse({ email, password });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Get redirect URL from query parameters
      const redirectUrl = searchParams.get('redirect') || '/dashboard';

      // Set auth state (this persists to localStorage)
      // Set auth state with callback to ensure localStorage is updated before redirect
      setAuth(data.user, data.token, () => {
        router.push(redirectUrl);
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthPageFallback(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner />
    </div>
  );
}

export default function AuthPage(): React.ReactElement {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
