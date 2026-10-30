import { Pressable, Text, View } from 'react-native';

import { accents, type AccentKey } from './palettes';
import { useThemeStore, type ThemeMode } from './theme-store';

const modes: ThemeMode[] = ['light', 'dark', 'system'];

export function ThemePanel() {
  const { mode, accent, setMode, setAccent } = useThemeStore();

  return (
    <View className="items-center gap-5">
      <Text className="text-base text-zinc-600 dark:text-zinc-300">Appearance</Text>
      <View className="flex-row gap-2">
        {modes.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            className={`rounded-full px-4 py-2 ${
              mode === m ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-800'
            }`}
          >
            <Text className={mode === m ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text className="text-base text-zinc-600 dark:text-zinc-300">Accent color</Text>
      <View className="flex-row gap-3">
        {(Object.keys(accents) as AccentKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setAccent(key)}
            style={{ backgroundColor: `rgb(${accents[key]})` }}
            className={`h-10 w-10 rounded-full ${
              accent === key ? 'border-4 border-zinc-900 dark:border-white' : ''
            }`}
          />
        ))}
      </View>
    </View>
  );
}
