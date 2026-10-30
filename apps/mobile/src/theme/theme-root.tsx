import { useColorScheme, vars } from 'nativewind';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

import { accents } from './palettes';
import { useThemeStore } from './theme-store';

export function ThemeRoot({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);
  const hydrated = useThemeStore((s) => s.hydrated);
  const hydrate = useThemeStore((s) => s.hydrate);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  return (
    <View
      style={[{ flex: 1 }, vars({ '--accent': accents[accent] })]}
      className="bg-white dark:bg-zinc-950"
    >
      {hydrated ? children : null}
    </View>
  );
}
