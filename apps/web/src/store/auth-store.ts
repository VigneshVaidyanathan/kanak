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
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, callback?: () => void) => void;
  clearAuth: () => void;
  initializeAuth: () => Promise<void>;
  validateToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token, callback) => {
        set({ user, token, isAuthenticated: true });

        // Wait for zustand persist middleware to complete
        if (callback) {
          setTimeout(() => {
            callback();
          }, 100);
        }
      },
      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
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
      validateToken: async () => {
        const state = get();

        if (!state.token) {
          return false;
        }

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
          return data.valid === true;
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
