'use client';

import { setupSchema } from '@kanak/shared';
import { Button, Input, Label, Spinner } from '@kanak/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SetupPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if users already exist on mount
  useEffect(() => {
    const checkSetup = async (): Promise<void> => {
      // First check if there's a JWT in localStorage
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('auth-storage');
        if (storedToken) {
          try {
            const parsed = JSON.parse(storedToken);
            if (parsed.state?.token) {
              // JWT exists in localStorage, redirect to auth
              router.replace('/auth');
              return;
            }
          } catch (e) {
            // Invalid stored data, continue to check setup
          }
        }
      }

      // No JWT found, proceed with setup check
      try {
        const response = await fetch('/api/setup/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data.hasUsers) {
          // Users already exist, redirect to auth page immediately
          router.replace('/auth');
          return;
        }
        // Only set checkingSetup to false if no users exist
        setCheckingSetup(false);
      } catch (error) {
        // Continue to setup page if check fails
        setCheckingSetup(false);
      }
    };

    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validatedData = setupSchema.parse({ email, password });

      const response = await fetch('/api/setup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      // Redirect to auth page after successful user creation
      router.push('/auth');
    } catch (err: any) {
      setError(err.message || 'An error occurred during setup');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking setup status
  if (checkingSetup) {
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
            Setup your account
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
              <p className="text-sm text-gray-500 mt-1 mb-2">
                Enter your email address. This will be used to sign in to your
                account.
              </p>
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
              <p className="text-sm text-gray-500 mt-1 mb-2">
                Choose a secure password. It must be at least 6 characters long.
              </p>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating user...' : 'Create a user'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
