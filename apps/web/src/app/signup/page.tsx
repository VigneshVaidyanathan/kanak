'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { setupSchema } from '@kanak/shared';
import { Button, Input, Label, Spinner } from '@kanak/ui';
import { ConvexError } from 'convex/values';
import { ZodError } from 'zod';
import { useConvexAuth } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/**
 * Sign-up for invited people: set a password once, then land on whichever
 * families invited you.
 *
 * Nothing here checks the invite. The server does, in auth.ts
 * `afterUserCreatedOrUpdated`, and rejects the sign-up with a message this
 * page shows as-is — a client-side check would only be a second copy of a
 * rule it cannot enforce.
 */
function SignUpContent() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const invitedEmail = useSearchParams().get('email') ?? '';

  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  if (isLoading) {
    return <Centered>{<Spinner />}</Centered>;
  }

  return (
    <Centered>
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Accept your invite
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Set a password once. Every family that invited this email shows up
            after you sign in.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            setupSchema
              .parseAsync({ email, password })
              .then((data) => signIn('password', { ...data, flow: 'signUp' }))
              .then(() => router.push('/'))
              .catch((err) => setError(signUpError(err)))
              .finally(() => setLoading(false));
          }}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
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
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating your account...' : 'Create account'}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a className="underline" href="/auth">
            Sign in
          </a>
        </p>
      </div>
    </Centered>
  );
}

function signUpError(err: unknown) {
  if (err instanceof ZodError) {
    return err.issues[0]?.message ?? 'Check your email and password.';
  }
  if (err instanceof ConvexError) {
    return String(err.data);
  }
  // Convex Auth rejects the sign-up by throwing out of the mutation, and the
  // message it hands back still carries ours.
  const raw = err instanceof Error ? err.message : '';
  if (raw.includes('no invite')) {
    return 'This email has no invite. Ask a family member to invite you first.';
  }
  if (raw.includes('already')) {
    return 'That email already has an account. Sign in instead.';
  }
  return 'Could not create your account. Please try again.';
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  );
}

export default function SignUpPage(): React.ReactElement {
  return (
    <Suspense fallback={<Centered>{<Spinner />}</Centered>}>
      <SignUpContent />
    </Suspense>
  );
}
