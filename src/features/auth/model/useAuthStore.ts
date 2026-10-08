import { create } from 'zustand';
import type { Me } from '@/shared/api/contract';
import {
  getMe,
  issueSession,
  login as loginRequest,
  revokeSession,
} from '@/shared/api/auth';
import { endSession, onSessionEnded, startSession } from '@/shared/api/session';
import { queryClient } from '@/app/providers/queryClient';

interface AuthState {
  user: Me | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  onSessionEnded(() => set({ user: null, isAuthenticated: false }));

  return {
    user: null,
    isAuthenticated: false,

    login: async ({ email, password }) => {
      const deviceSessionToken = await loginRequest(email, password);
      await issueSession(deviceSessionToken);
      startSession();
      try {
        const user = await getMe();
        set({ user, isAuthenticated: true });
      } catch (error) {
        endSession();
        throw error;
      }
    },

    logout: async () => {
      try {
        await queryClient.cancelQueries();
        await revokeSession();
      } catch {
        // local logout must succeed even if revoke fails
      } finally {
        queryClient.clear();
        endSession();
        set({ user: null, isAuthenticated: false });
      }
    },
  };
});
