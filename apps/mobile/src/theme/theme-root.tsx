import { useColorScheme, vars } from 'nativewind';
import { useEffect, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

import { deriveAccent, deriveSurfaces, hexToRgb } from '@/lib/color';
import { useThemeStore } from './theme-store';

export function ThemeRoot({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);
  const surface = useThemeStore((s) => s.surface);
  const hydrated = useThemeStore((s) => s.hydrated);
  const hydrate = useThemeStore((s) => s.hydrate);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  // Accent colors and the background ramp are all generated from the user's choices.
  const cssVars = useMemo(() => {
    const d = deriveAccent(accent, colorScheme === 'dark' ? 'dark' : 'light');
    const on = hexToRgb(d.onAccent);
    return vars({
      '--accent': d.accentRgb,
      '--on-accent': `${on.r} ${on.g} ${on.b}`,
      ...deriveSurfaces(accent, surface),
    });
  }, [accent, surface, colorScheme]);

  return (
    <View style={[{ flex: 1 }, cssVars]} className="bg-zinc-50 dark:bg-zinc-950">
      {hydrated ? children : null}
    </View>
  );
}
