import { create } from 'zustand';
import { User } from '../../shared/types/index.ts';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('shikkis-user') || 'null'),
  token: localStorage.getItem('shikkis-token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('shikkis-user', JSON.stringify(user));
    localStorage.setItem('shikkis-token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('shikkis-user');
    localStorage.removeItem('shikkis-token');
    set({ user: null, token: null });
  },

  initialize: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        set({ user: data.user });
        localStorage.setItem('shikkis-user', JSON.stringify(data.user));
      } else {
        get().logout();
      }
    } catch {
      get().logout();
    }
  },
}));
