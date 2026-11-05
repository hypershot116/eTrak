import { useColorScheme } from 'nativewind';
import { useMemo } from 'react';

import { deriveAccent } from '@/lib/color';
import { useThemeStore } from '@/theme/theme-store';

// The user's accent color plus everything derived from it (glow, tint, gradient, text color).
export function useAccent() {
  const accent = useThemeStore((s) => s.accent);
  const { colorScheme } = useColorScheme();
  return useMemo(
    () => deriveAccent(accent, colorScheme === 'dark' ? 'dark' : 'light'),
    [accent, colorScheme]
  );
}
