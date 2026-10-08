import { create } from 'zustand';
import type { Me } from '@/shared/api/contract';
import { apiFetch, setOnUnauthorized } from '@/shared/api/client';
import { getOrCreateFingerprint } from '@/shared/lib/fingerprint';
import { CAPTCHA_HEADER } from '@/mocks/constants';

interface AuthState {
  user: Me | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: {
    email: string;
    password: string;
    captchaToken: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Subscribe to auto-logout in case of irreparable session expiration from apiFetch
  setOnUnauthorized(() => {
    set({ user: null, isAuthenticated: false, isLoading: false });
  });

  return {
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    checkAuth: async () => {
      set({ isInitializing: true });
      try {
        const user = await apiFetch<Me>('/api/v1/me');
        set({ user, isAuthenticated: true, isInitializing: false });
      } catch {
        set({ user: null, isAuthenticated: false, isInitializing: false });
      }
    },

    login: async ({ email, password, captchaToken }) => {
      set({ isLoading: true, error: null });
      try {
        const fingerprint = getOrCreateFingerprint();

        // Step 1: POST /api/auth/login -> we get device_session_token
        const loginRes = await apiFetch<{ device_session_token: string }>(
          '/api/auth/login',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [CAPTCHA_HEADER]: captchaToken,
            },
            body: JSON.stringify({ email, password, fingerprint }),
          }
        );

        // Step 2: POST /api/auth/token/issue -> activate the session
        await apiFetch<{ success: boolean }>('/api/auth/token/issue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            device_session_token: loginRes.device_session_token,
            fingerprint,
          }),
        });

        // Step 3: GET /api/v1/me -> fetch user profile
        const user = await apiFetch<Me>('/api/v1/me');
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Authentication failed';
        set({ isLoading: false, error: message });
        throw err;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await apiFetch('/api/auth/token/revoke', { method: 'POST' });
      } catch {
        // Ignore network errors during logout
      } finally {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },
  };
});
