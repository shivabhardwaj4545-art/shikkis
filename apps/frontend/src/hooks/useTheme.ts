import { useThemeStore } from '@/stores/theme.store';

import type { ResolvedTheme, ThemePreference } from '@/stores/theme.store';

export type { ResolvedTheme, ThemePreference };

/**
 * Hook for consuming the theme store in components.
 *
 * Returns:
 *   - preference: what the user selected ('light' | 'dark' | 'system')
 *   - resolved: actual applied theme ('light' | 'dark')
 *   - setPreference: update the user's choice
 *   - isDark: shorthand boolean
 */
export function useTheme() {
  const preference = useThemeStore((s) => s.preference);
  const resolved = useThemeStore((s) => s.resolved);
  const setPreference = useThemeStore((s) => s.setPreference);

  return {
    preference,
    resolved,
    setPreference,
    isDark: resolved === 'dark',
  };
}
