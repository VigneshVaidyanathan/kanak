import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, callback?: () => void) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      setAuth: (user, token, callback) => {
        // Tokens expire in 7 days (matching server-side expiration)
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        set({ user, token, tokenExpiresAt: expiresAt, isAuthenticated: true });

        // Wait for zustand persist middleware to complete
        if (callback) {
          setTimeout(() => {
            callback();
          }, 100);
        }
      },
      clearAuth: () => {
        set({
          user: null,
          token: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },
      isTokenExpired: (): boolean => {
        const state = get();
        if (!state.tokenExpiresAt) {
          return true; // No expiration info means we should verify
        }
        return Date.now() >= state.tokenExpiresAt;
      },
      initializeAuth: async () => {
        // This will be called on mount to check localStorage
        const state = get();
        if (state.token && state.user) {
          // Validate token on initialization
          const isValid = await state.validateToken();
          if (isValid) {
            set({ isAuthenticated: true });
          } else {
            // Clear invalid token
            get().clearAuth();
          }
        }
      },
      validateToken: async (): Promise<boolean> => {
        const state = get();

        if (!state.token) {
          return false;
        }

        // Check if token is expired before making API call
        if (!state.isTokenExpired()) {
          // Token is not expired, assume it's valid
          return true;
        }

        // Token is expired or we don't have expiration info, verify with server
        try {
          // Verify token via API route (not directly calling server actions)
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: state.token }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Token verification failed');
          }

          const data = await response.json();

          if (data.valid === true) {
            // Token is valid, update expiration (7 days from now)
            const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
            set({ tokenExpiresAt: expiresAt });
            return true;
          }

          return false;
        } catch (error: any) {
          // Token is invalid or expired
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
