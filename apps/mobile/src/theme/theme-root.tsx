import { useColorScheme, vars } from 'nativewind';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { deriveAccent, deriveSurfaces, hexToRgb } from '@/lib/color';
import { useThemeStore } from './theme-store';

export function ThemeRoot({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);
  const surface = useThemeStore((s) => s.surface);
  const hydrated = useThemeStore((s) => s.hydrated);
  const hydrate = useThemeStore((s) => s.hydrate);
  const { colorScheme, setColorScheme } = useColorScheme();
  const mountedRef = useRef(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      const timer = setTimeout(() => {
        if (colorScheme !== mode) {
          setColorScheme(mode);
        }
      }, 50);
      return () => clearTimeout(timer);
    }

    if (colorScheme !== mode) {
      if (Platform.OS === 'web' && typeof requestAnimationFrame !== 'undefined') {
        const frame = requestAnimationFrame(() => {
          setColorScheme(mode);
        });
        return () => cancelAnimationFrame(frame);
      } else {
        setColorScheme(mode);
      }
    }
  }, [mode, colorScheme, setColorScheme]);

  const cssVars = useMemo(() => {
    const activeScheme = (mode === 'system' ? colorScheme : mode) === 'dark' ? 'dark' : 'light';
    const d = deriveAccent(accent, activeScheme);
    const on = hexToRgb(d.onAccent);
    return vars({
      '--accent': d.accentRgb,
      '--on-accent': `${on.r} ${on.g} ${on.b}`,
      ...deriveSurfaces(accent, surface),
    });
  }, [accent, surface, mode, colorScheme]);

  return (
    <View style={[{ flex: 1 }, cssVars]} className="bg-zinc-50 dark:bg-zinc-950">
      {hydrated ? children : null}
    </View>
  );
}
