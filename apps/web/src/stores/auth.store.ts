import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSession } from '@mrikipos/shared-types';
import { clearLocalCache } from '@/lib/db/dexie';

interface AuthState {
  user: UserSession | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserSession, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof document !== 'undefined') {
          document.cookie = `mrikipos_auth=${accessToken}; path=/; max-age=604800; samesite=lax`;
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },
      clearAuth: () => {
        clearLocalCache();
        if (typeof document !== 'undefined') {
          document.cookie = 'mrikipos_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'mrikipos-auth',
    },
  ),
);
