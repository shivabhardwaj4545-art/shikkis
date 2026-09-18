import { create } from 'zustand';
import { api, type UserProfile } from '@/lib/api';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  demoUsers: Array<{ id: string; email: string; first_name: string; last_name: string; role: string }>;

  initAuth: () => Promise<void>;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchUser: (email: string) => Promise<void>;
  setAuthSession: (user: UserProfile, accessToken: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,
  demoUsers: [],

  setAuthSession: (user: UserProfile, accessToken: string) => {
    localStorage.setItem('shikkis_access_token', accessToken);
    set({ user, initialized: true });
  },

  initAuth: async () => {
    try {
      set({ loading: true });

      // Fetch demo users for QA switcher
      try {
        const demoRes = await api.getDemoUsers();
        set({ demoUsers: demoRes.users });
      } catch {
        // ignore
      }

      // Check current user session
      try {
        const res = await api.getMe();
        set({ user: res.user, initialized: true });
        return;
      } catch {
        // Not logged in or guest: clear stale token if any, stay logged out
        localStorage.removeItem('shikkis_access_token');
        set({ user: null, initialized: true });
      }
    } finally {
      set({ loading: false });
    }
  },

  login: async (email: string, password: string = 'shikkis_dev_cust_2026!') => {
    try {
      set({ loading: true });
      const res = await api.login(email, password);
      localStorage.setItem('shikkis_access_token', res.accessToken);
      set({ user: res.user });
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      set({ loading: true });
      await api.logout();
      localStorage.removeItem('shikkis_access_token');
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  switchUser: async (email: string) => {
    await get().login(email, 'shikkis_dev_cust_2026!');
    window.location.reload();
  },
}));
