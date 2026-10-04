import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@flowdesk/shared-types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null }),
    }),
    { name: 'flowdesk-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken }) }
  )
);
