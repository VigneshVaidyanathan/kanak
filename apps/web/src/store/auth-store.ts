import { create } from 'zustand';

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
  setAuth: (user: User | null, token: string | null) => void;
  clearAuth: () => void;
}

/**
 * ponytail: a read-only mirror of Convex Auth, not a source of truth.
 *
 * Convex Auth owns the session (an httpOnly cookie plus an in-memory JWT) and
 * the middleware owns route protection. This store exists only because ~25
 * components still call the REST API routes and read `token` to decide when
 * they may fetch. `AuthSync` keeps it in step with Convex Auth.
 *
 * Delete it, and this file, once the last /api route is gone: components that
 * call Convex directly need neither the token nor the flag.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) =>
    set({ user, token, isAuthenticated: token !== null }),
  clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
}));
