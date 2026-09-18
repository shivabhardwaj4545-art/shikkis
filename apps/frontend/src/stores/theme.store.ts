import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  /** What the user chose — stored in localStorage */
  preference: ThemePreference;
  /** The actual theme applied to the DOM right now */
  resolved: ResolvedTheme;
  /** Update user preference and resolve it immediately */
  setPreference: (pref: ThemePreference) => void;
  /** Called internally when the OS preference changes */
  _resolveFromSystem: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? getSystemTheme() : pref;
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useThemeStore = create<ThemeState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        preference: 'system',
        resolved: resolve('system'),

        setPreference(pref) {
          const resolved = resolve(pref);
          applyTheme(resolved);
          set({ preference: pref, resolved });
        },

        _resolveFromSystem() {
          const { preference } = get();
          if (preference === 'system') {
            const resolved = getSystemTheme();
            applyTheme(resolved);
            set({ resolved });
          }
        },
      }),
      {
        name: 'shikkis-theme', // localStorage key per AGENTS.md
        // Only persist the user's preference, not the resolved value
        partialize: (state) => ({ preference: state.preference }),
        onRehydrateStorage: () => (state) => {
          // After hydration, resolve and apply the correct theme
          if (state) {
            const resolved = resolve(state.preference);
            applyTheme(resolved);
            state.resolved = resolved;
          }
        },
      },
    ),
  ),
);

// ─── System preference listener ───────────────────────────────────────────────
// Wire up outside the store so it's a singleton effect

if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    useThemeStore.getState()._resolveFromSystem();
  });
}
