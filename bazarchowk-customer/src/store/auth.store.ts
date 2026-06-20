import { create } from 'zustand';
import { AuthService, type User } from '@/services';
import { TokenStorage, authEventEmitter } from '@/services/api';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password?: string, phone?: string) => Promise<void>;
  guestLogin: (deviceId: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for 401 unauthenticated events from API interceptor
  authEventEmitter.on('logout', () => {
    set({ user: null, isAuthenticated: false });
  });

  return {
    // ── Initial State ──────────────────────────────────────────────────────────
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,

    // ── Initialize (check for stored token) ───────────────────────────────────
    initialize: async () => {
      try {
        const token = await TokenStorage.getAccessToken();
        if (token) {
          const user = await AuthService.getProfile();
          set({ user, isAuthenticated: true, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      } catch {
        await TokenStorage.clearTokens();
        set({ isInitialized: true, isAuthenticated: false, user: null });
      }
    },

    // ── Login ─────────────────────────────────────────────────────────────────
    login: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const response = await AuthService.login({ email, password });
        set({ user: response.user, isAuthenticated: true, isLoading: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Login failed';
        set({ error: message, isLoading: false });
        throw err;
      }
    },

    // ── Register ──────────────────────────────────────────────────────────────
    register: async (firstName, lastName, email, password, phone) => {
      set({ isLoading: true, error: null });
      try {
        const response = await AuthService.register({ firstName, lastName, email, password, phone });
        set({ user: response.user, isAuthenticated: true, isLoading: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        set({ error: message, isLoading: false });
        throw err;
      }
    },

    // ── Guest Login ───────────────────────────────────────────────────────────
    guestLogin: async (deviceId) => {
      set({ isLoading: true, error: null });
      try {
        const response = await AuthService.guestLogin(deviceId);
        set({ user: response.user, isAuthenticated: true, isLoading: false });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Guest Login failed';
        set({ error: message, isLoading: false });
        throw err;
      }
    },

    // ── Logout ────────────────────────────────────────────────────────────────
    logout: async () => {
      set({ isLoading: true });
      try {
        await AuthService.logout();
      } finally {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },

    // ── Helpers ───────────────────────────────────────────────────────────────
    clearError: () => set({ error: null }),
    setUser: (user) => set({ user }),
  };
});
