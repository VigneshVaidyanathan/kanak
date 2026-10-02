'use client';

import { api } from '@kanak/convex/src/_generated/api';
import { useAuthActions } from '@convex-dev/auth/react';
import { loginSchema } from '@kanak/shared';
import { Button, Input, Label, Spinner } from '@kanak/ui';
import { useConvexAuth, useQuery } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Nobody registered yet: send them to setup instead of an unusable form.
  const hasUsers = useQuery(api.users.hasUsers, {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectUrl = searchParams.get('redirect') || '/';
  const checkingAuth = isLoading || hasUsers === undefined;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectUrl);
    } else if (hasUsers === false) {
      router.replace('/setup');
    }
  }, [isAuthenticated, hasUsers, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validatedData = loginSchema.parse({ email, password });

      await signIn('password', { ...validatedData, flow: 'signIn' });

      router.push(redirectUrl);
    } catch (err: any) {
      // Convex Auth deliberately does not say whether it was the email or the
      // password that was wrong.
      setError(
        err?.message?.includes('InvalidAccountId') ||
          err?.message?.includes('Invalid credentials')
          ? 'Invalid email or password'
          : err.message || 'An error occurred during login'
      );
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
        <p className="text-center text-sm text-gray-500">
          Invited to a family?{' '}
          <a className="underline" href="/signup">
            Create your account
          </a>
        </p>
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
